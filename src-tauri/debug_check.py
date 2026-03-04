import subprocess
import sys

def main():
    try:
        result = subprocess.run(['cargo', 'check'], capture_output=True, text=True, cwd='c:\\Projects\\AccountingFlow\\src-tauri', encoding='utf-8')
        print("STDOUT:")
        print(result.stdout)
        print("STDERR:")
        print(result.stderr)
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    main()
