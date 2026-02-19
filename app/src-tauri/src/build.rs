use serde::Serialize;
use std::process::Stdio;
use tauri::ipc::Channel;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase", tag = "event", content = "data")]
pub enum BuildEvent {
    Stdout { line: String },
    Stderr { line: String },
    Exit { code: i32 },
}

#[tauri::command]
pub async fn start_build(on_event: Channel<BuildEvent>) -> Result<(), String> {
    // Find project root
    let root = std::env::current_dir().map_err(|e| e.to_string())?;
    let mut dir = root.as_path();
    loop {
        if dir.join("flake.nix").exists() {
            break;
        }
        dir = dir.parent().ok_or("Could not find project root")?;
    }

    let mut child = Command::new("totem")
        .current_dir(dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start build: {e}"))?;

    let stdout = child.stdout.take().ok_or("No stdout")?;
    let stderr = child.stderr.take().ok_or("No stderr")?;

    let on_event_clone = on_event.clone();

    // Stream stdout
    let stdout_task = tokio::spawn(async move {
        let reader = BufReader::new(stdout);
        let mut lines = reader.lines();
        while let Ok(Some(line)) = lines.next_line().await {
            let _ = on_event_clone.send(BuildEvent::Stdout { line });
        }
    });

    // Stream stderr
    let on_event_clone2 = on_event.clone();
    let stderr_task = tokio::spawn(async move {
        let reader = BufReader::new(stderr);
        let mut lines = reader.lines();
        while let Ok(Some(line)) = lines.next_line().await {
            let _ = on_event_clone2.send(BuildEvent::Stderr { line });
        }
    });

    // Wait for process
    let status = child
        .wait()
        .await
        .map_err(|e| format!("Build failed: {e}"))?;
    stdout_task.await.ok();
    stderr_task.await.ok();
    let _ = on_event.send(BuildEvent::Exit {
        code: status.code().unwrap_or(-1),
    });

    Ok(())
}
