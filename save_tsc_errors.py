import subprocess
import sys

def main():
    try:
        result = subprocess.run(['npx', 'tsc'], capture_output=True, cwd='c:\\Projects\\AccountingFlow', shell=True)
        with open('tsc_errors_utf8.txt', 'wb') as f:
            f.write(result.stdout)
            f.write(result.stderr)
        print("Done.")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    main()
