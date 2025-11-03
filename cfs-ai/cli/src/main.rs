/*
 * Copyright (c) 2025 Analog Devices, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


use std::env;
use std::path::PathBuf;
use std::process::{Command, exit};

#[cfg(target_os = "windows")]
const PYTHON_BINARY: &str = "python.exe";

#[cfg(not(target_os = "windows"))]
const PYTHON_BINARY: &str = "python3";

/// Function to determine the Python executable path.
/// Returns a `Result<PathBuf, String>` to handle errors gracefully.
fn get_python_path() -> Result<PathBuf, String> {
    let exe_dir = env::current_exe()
        .map_err(|e| format!("Error determining executable path: {}", e))?
        .parent()
        .and_then(|p| p.parent())
        .map(|p| p.join("python"))
        .ok_or_else(|| "Error: Unable to determine parent directory of executable.".to_string())?;

    if cfg!(target_os = "windows") {
        Ok(exe_dir.join(PYTHON_BINARY))
    } else {
        Ok(exe_dir.join("bin").join(PYTHON_BINARY))
    }
}

fn main() {
    
    // Determine the Python path
    let python_path = match get_python_path() {
        Ok(path) => path,
        Err(err) => {
            eprintln!("{}", err);
            exit(1);
        }
    };

    // Collect and forward CLI arguments
    let args: Vec<String> = env::args().skip(1).collect();

    let status = Command::new(python_path)
        .env_remove("PYTHONHOME")
        .env_remove("PYTHONPATH")
        .arg("-m")
        .arg("cfsai")
        .args(&args)
        .status();

    match status {
        Ok(code) => {
            exit(code.code().unwrap_or(1));
        }
        Err(e) => {
            eprintln!("Failed to start Python process: {}", e);
            exit(1);
        }
    }
}
