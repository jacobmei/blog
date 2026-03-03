import os
import re
import yaml
import json
from datetime import datetime

RESEARCH_DIR = "/Users/jacobmei/Blog/src/content/research"

# Pillar mapping to new research topics
PILLAR_MAP = {
    "Gospel": "mission",
    "Learning": "spirituality",
    "Life": "spirituality",
    "Work": "governance",
    "General": "church-history"
}

def clean_tag(tag):
    return tag.replace("#", "").strip()

def process_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Regex to capture Frontmatter
    fm_match = re.match(r'^---\s*\n(.*?)\n---\s*\n', content, re.DOTALL)
    if not fm_match:
        return

    fm_raw = fm_match.group(1)
    body = content[fm_match.end():]
    
    try:
        fm = yaml.safe_load(fm_raw)
    except yaml.YAMLError:
        return

    # Extract info from filename
    filename = os.path.basename(file_path)
    # Pattern: 2026-03-02_AUTO_Title.md or 2026-03-02_AUTO_Title.docx.md
    file_dt_match = re.search(r'^(\d{4}-\d{2}-\d{2})_AUTO_(.*)$', filename)
    
    if file_dt_match:
        pub_date_str = file_dt_match.group(1)
        # title is the rest, removing .docx.md or .pdf.md etc.
        raw_title = file_dt_match.group(2)
        title = re.sub(r'\.(docx|pdf|txt|xlsx)\.md$', '', raw_title)
    else:
        pub_date_str = datetime.now().strftime('%Y-%m-%d')
        title = fm.get('title', filename.replace('.md', ''))

    # Extract summary from <!-- DATA ... --> or [!TIP]
    description = ""
    # Try DATA block first
    data_match = re.search(r'<!-- DATA\n(.*?)\n-->', body, re.DOTALL)
    if data_match:
        try:
            data_json = json.loads(data_match.group(1))
            description = data_json.get('summary', '')
        except:
            pass
    
    # If not found, try [!TIP]
    if not description:
        tip_match = re.search(r'> \[!TIP\] 內容摘要\n>\s*(.*?)\n\n', body, re.DOTALL)
        if tip_match:
            description = tip_match.group(1).strip()

    # Map tags
    raw_tags = fm.get('tags', [])
    if isinstance(raw_tags, list):
        tags = [clean_tag(t) for t in raw_tags]
    else:
        tags = []

    # Map pillar to category (which we use for topics in logic)
    old_pillar = fm.get('pillar', 'General')
    category = PILLAR_MAP.get(old_pillar, 'church-history')

    # Construct new Frontmatter
    new_fm = {
        "title": title,
        "description": description or title,
        "pubDate": pub_date_str,
        "category": category,
        "tags": tags
    }

    # Re-assemble
    new_content = f"---\n{yaml.dump(new_fm, allow_unicode=True, sort_keys=False)}---\n{body}"
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print(f"Processed: {filename} -> {category}")

def main():
    files = [f for f in os.listdir(RESEARCH_DIR) if f.endswith(".md") and f != "test-research-post.md"]
    for f in files:
        process_file(os.path.join(RESEARCH_DIR, f))

if __name__ == "__main__":
    main()
