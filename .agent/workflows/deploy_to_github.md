---
description: How to push the Slim Controller version to a new GitHub repository
---

# Deploying AccountingFlow Slim Version to GitHub

You have finalized the "Slim Controller Ver.1" update. To upload this to your new `AccountingFlow_slim` repository, follow these steps:

1.  **Create Repository**:
    - Go to [GitHub.com](https://github.com/new).
    - Create a new repository named `AccountingFlow_slim`.
    - Do **not** initialize with README, .gitignore, or License (keep it empty).

2.  **Push Code**:
    Run the following commands in your VS Code terminal:

    ```bash
    # 1. Remove the old remote link (if it exists)
    git remote remove origin

    # 2. Add the new remote link (Confirm your username is dougie1004)
    git remote add origin https://github.com/dougie1004/AccountingFlow_slim.git

    # 3. Rename the main branch to 'main' (if not already)
    git branch -M main

    # 4. Push the code
    git push -u origin main
    ```

This will upload your refined **Daily Cash Report**, **VAT & Risk Management**, and **AI Spending Analysis** features to the new repository.
