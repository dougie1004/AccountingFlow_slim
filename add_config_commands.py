import os
import re

file_path = r'c:\Projects\AccountingFlow\src-tauri\src\commands.rs'

# 프론트엔드에서 호출할 설정 관련 커맨드 추가
new_commands = """
#[tauri::command]
pub fn save_tenant_config(app: tauri::AppHandle, config: TenantConfig) -> Result<(), String> {
    crate::core::config_manager::save_config(&app, config)
}

#[tauri::command]
pub fn load_tenant_config(app: tauri::AppHandle) -> Result<TenantConfig, String> {
    crate::core::config_manager::load_config(&app)
}
"""

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 파일 끝에 커맨드 추가 (중복 방지는 수동으로 확인됨)
if "save_tenant_config" not in content:
    with open(file_path, 'a', encoding='utf-8') as f:
        f.write(new_commands)
    print("Successfully added config commands to commands.rs")
else:
    print("Config commands already exist.")
