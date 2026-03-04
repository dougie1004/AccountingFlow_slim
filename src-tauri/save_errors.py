import subprocess
import sys

def main():
    try:
        result = subprocess.run(['cargo', 'check'], capture_output=True, cwd='c:\\Projects\\AccountingFlow\\src-tauri')
        with open('cargo_errors.txt', 'wb') as f:
            f.write(result.stderr)
        print("Done.")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    main()
