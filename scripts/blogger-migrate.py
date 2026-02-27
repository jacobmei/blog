#!/usr/bin/env python3
import os
import re
import json
import uuid
from datetime import datetime
from bs4 import BeautifulSoup
from markdownify import markdownify as md

# 配置路徑
FEED_PATH = "/Users/jacobmei/Downloads/Takeout/Blogger/Blogs/小梅子 - Jacob Mei Labs/feed.atom"
ALBUMS_DIR = "/Users/jacobmei/Downloads/Takeout/Blogger/Albums/Blogger - 小梅子 - Jacob Mei Labs"
OUTPUT_DIR = "/Users/jacobmei/Blog/src/content/blog"
ASSETS_DIR = "/Users/jacobmei/Blog/src/content/blog/assets/blogger"

# 標籤映射表
TAG_MAPPING = {
    "加密貨幣": "web3",
    "冷錢包": "web3",
    "熱錢包": "web3",
    "Metamask": "web3",
    "Ledger": "web3",
    "Coolwallet": "web3",
    "Trezor": "web3",
    "nft": "web3",
    "Google": "網路與社群",
    "facebook": "網路與社群",
    "電子商務": "網路與社群",
    "教學": "AI與科技",
    "行銷": "網路與社群",
    "獨立書店": "網路與社群",
    "有河": "網路與社群",
    "治理": "治理與民主",
    "民主": "治理與民主",
    "基督教": "信仰",
    "靈修": "信仰",
    "棒球": "運動健康",
    "健康": "運動健康",
    "運動": "運動健康"
}

def get_target_topic(blogger_tags):
    topics = set()
    for tag in blogger_tags:
        if tag in TAG_MAPPING:
            topics.add(TAG_MAPPING[tag])
    
    if not topics:
        return ["隨筆"]
    return list(topics)

def preprocess_blogger_html(html_content):
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # 處理 Blogger 的圖片容器表格 (tr-caption-container)
    tables = soup.find_all('table', class_='tr-caption-container')
    for table in tables:
        img = table.find('img')
        caption_div = table.find('td', class_='tr-caption')
        caption_text = caption_div.get_text(strip=True) if caption_div else ""
        
        # 建立簡化結構
        new_tag = soup.new_tag('div')
        new_tag['class'] = 'blogger-img-wrapper'
        if img:
            new_tag.append(img)
        if caption_text:
            cap_p = soup.new_tag('p')
            cap_p['class'] = 'blogger-img-caption'
            cap_p.string = caption_text
            new_tag.append(cap_p)
            
        table.replace_with(new_tag)
        
    # 移除空標籤
    for empty in soup.find_all(['div', 'p', 'span'], string=re.compile(r'^\s*$')):
        if not empty.find_all(): # 如果沒有子標籤
            empty.decompose()
            
    return str(soup)

def localize_images(html_content, post_id):
    # 先進行結構預處理
    cleaned_html = preprocess_blogger_html(html_content)
    soup = BeautifulSoup(cleaned_html, 'html.parser')
    imgs = soup.find_all('img')
    
    for img in imgs:
        src = img.get('src', '')
        if not src:
            continue
            
        parts = src.split('/')
        # 處理包含 = 的參數或是長 ID
        filename_part = parts[-1].split('?')[0].split('=')[0]
        
        matched_local = None
        # 嘗試直接匹配
        if os.path.exists(os.path.join(ALBUMS_DIR, filename_part)):
            matched_local = os.path.join(ALBUMS_DIR, filename_part)
        
        if matched_local:
            # 複製檔案
            # 避免重複副檔名
            _, ext = os.path.splitext(matched_local)
            if filename_part.lower().endswith(ext.lower()):
                clean_name = filename_part[:-len(ext)] if ext else filename_part
            else:
                clean_name = filename_part
                
            new_filename = f"blogger-{post_id}-{clean_name}{ext}"
            target_path = os.path.join(ASSETS_DIR, new_filename)
            if not os.path.exists(target_path):
                import shutil
                shutil.copy2(matched_local, target_path)
            
            img['src'] = f"/src/content/blog/assets/blogger/{new_filename}"
            print(f"  [Localized] {filename_part}")
        else:
            if src.startswith('//'):
                img['src'] = 'https:' + src
            
    return str(soup)

def migrate(limit=None):
    if not os.path.exists(ASSETS_DIR):
        os.makedirs(ASSETS_DIR)
        
    with open(FEED_PATH, 'r', encoding='utf-8') as f:
        xml_data = f.read()
    
    soup = BeautifulSoup(xml_data, 'xml')
    entries = soup.find_all('entry')
    
    count = 0
    for entry in entries:
        # 過濾非文章
        entry_type = entry.find('blogger:type')
        if not entry_type or entry_type.text != 'POST':
            continue
            
        status = entry.find('blogger:status')
        if status and status.text == 'DRAFT':
            continue

        title_el = entry.find('title')
        title = title_el.text if title_el else "Untitled"
        
        published_el = entry.find('published')
        published = published_el.text if published_el else datetime.now().isoformat()
        
        content_el = entry.find('content')
        content_raw = content_el.text if content_el else ""
        
        # 標籤
        categories = entry.find_all('category')
        blogger_tags = []
        for cat in categories:
            term = cat.get('term')
            scheme = cat.get('scheme', '')
            if term and 'kind#post' not in term and 'ns.google.com' not in scheme:
                blogger_tags.append(term)
        
        # --- 標籤優化邏輯 (梅大需求) ---
        TAGS_TO_DELETE = {"誰的", "人生啊", "一日遊", "日光下", "名片", "事求人"}
        TAG_MERGES = {
            "旅行": "旅遊",
            "區塊鏈金融": "區塊鏈",
            "街口": "街口支付",
            "棒球": "運動健康",
            "健康": "運動健康",
            "運動": "運動健康"
        }
        refined_tags = []
        for tag in blogger_tags:
            if tag in TAGS_TO_DELETE: continue
            new_tag = TAG_MERGES.get(tag, tag)
            if new_tag not in refined_tags: refined_tags.append(new_tag)
        blogger_tags = refined_tags
        # --------------------------
        
        topics = get_target_topic(blogger_tags)
        
        try:
            dt = datetime.fromisoformat(published.replace('Z', '+00:00'))
        except ValueError:
            dt = datetime.now()
            
        date_str = dt.strftime('%Y-%m-%d')
        
        import hashlib
        short_hash = hashlib.md5(f"{published}-{title}".encode()).hexdigest()[:8]
        filename = f"{date_str}-{short_hash}.md"
        
        # 處理圖片在地化
        processed_html = localize_images(content_raw, short_hash)
        
        # Markdown 轉換
        md_content = md(processed_html, heading_style="ATX", bullets="-")
        
        # 清理多餘空行
        md_content = re.sub(r'\n{3,}', '\n\n', md_content)
        
        md_file_content = f"""---
title: "{title.replace('"', '\\"')}"
pubDate: {published}
description: "{title.replace('"', '\\"')}"
category: {topics[0] if topics else "隨筆"}
tags: {json.dumps(blogger_tags, ensure_ascii=False)}
shortCode: bg-{short_hash}
---

{md_content.strip()}
"""
        
        target_file = os.path.join(OUTPUT_DIR, filename)
        with open(target_file, 'w', encoding='utf-8') as out:
            out.write(md_file_content)
            
        print(f"Migrated: {filename} ({title[:30]})")
        count += 1
        if limit and count >= limit:
            break

if __name__ == "__main__":
    import sys
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else None
    migrate(limit=limit)
