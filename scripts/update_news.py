
name: Update F1 news

on:
  workflow_dispatch:
  schedule:
    - cron: '17 * * * *'

permissions:
  contents: write

jobs:
  update:
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install news decoder
        run: |
          python -m pip install --upgrade pip
          python -m pip install "googlenewsdecoder==0.2.1" "selectolax<1.0"

      - name: Fetch latest F1 headlines
        run: python scripts/update_news.py

      - name: Commit updates
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"

          git add news.json

          if ! git diff --cached --quiet; then
            git commit -m "Update F1 news"
            git push
          fi
