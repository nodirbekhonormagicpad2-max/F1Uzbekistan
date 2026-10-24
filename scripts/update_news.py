
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
    timeout-minutes: 5

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install translator
        run: python -m pip install deep-translator==1.11.4

      - name: Fetch latest F1 headlines
        run: python scripts/update_news.py

      - name: Commit updates
        run: |
          if ! git diff --quiet -- news.json; then
            git config user.name 'github-actions[bot]'
            git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
            git add news.json
            git commit -m 'Update F1 news'
            git push
          fi
