---
title: Where Do You Stand in the AI Library?
description: |-
  After Karpathy's AI knowledge base went viral, everyone asked: "How do I build mine?" But the real question is — where do you stand in it?
  AI can build the library. It can't fill the one position that matters: the person at the shelf deciding what a book means to them.
pubDate: 2026-04-05 22:45+08:00
author: jacobmei
category: AI與科技
tags:
  - Markdown
  - obsidian
draft: false
featured: true
cover: ./assets/20260405.jpg
shortCode: 3zsgf5
---
# Where Do You Stand in the AI Library?

After Karpathy published his article on AI knowledge bases and open-sourced his methodology, a lot of people started learning and sharing: "How do I turn AI into my own personal library?"

But I want to approach this from a different angle: in this vast AI library, where do _you_ intend to stand? Not as the librarian, not as a reader, but — do you plan to disappear into it, or do you plan to remain yourself?

I started writing online early. When I was younger I ran my own servers, built my own websites, then moved to Google Blogger, tried all kinds of platforms — but looking back, a lot of things just vanished. Not broken, just gone. Platforms shut down, formats became obsolete, accounts had issues. Not necessarily anything irreplaceable, but still… gone.

Last year I spent some time converting everything into Markdown. I even built a small open-source tool called [doc-cleaner](https://github.com/notoriouslab/doc-cleaner) to handle it: batch-converting PDFs, DOCXs, and XLSXs into clean Markdown — Chinese-friendly, table-friendly, privacy-first. Once cleaned, I host it on GitHub Pages, merging the knowledge base and the website into one.

Now my articles, my notes, my website — all plain-text `.md` files, living in my own repo. I know where they are, and I know they won't suddenly disappear.

This shift also gave my entire AI workflow a clear principle: tools can change, formats cannot be locked down, and data stays in your own hands.

---

**On AI: The Express Lane, the Fermentation Vat, and the Pantry**

I love cooking, so I naturally think about all of this in kitchen terms.

**AI / LLM (fast)** is my express prep station — the best tools for handling whatever ingredients I'm working with right now. I use LLM + CMUX as my working environment. CMUX lets me easily pull Markdown data straight from the terminal; once things are registered it's fast, and it's easy to layer in fresh research to make the cooking more distinctive.

**Obsidian (slow)** is the fermentation vat, the slow cooker. It takes time to settle. That's the flavor AI can't replicate. This is my corner for quiet reflection — where I put things I've already thought through.

**Markdown files (foundation)** are the home pantry. No matter which pot or tool I switch to, the ingredients are always there, never locked into any platform's format.

The bridge between all three is Markdown itself. Insights or new ideas from the working environment flow back into the Obsidian side; things that have settled in Obsidian can be pulled into the working environment at any time.

For a while I had both sides integrated, heavily using automation to break down and recombine data — it worked pretty well, actually.

Then I separated them again. Ha.

---

Obsidian co-founder Steph Ango said something I found really interesting: your own notes and an AI-generated knowledge base should be stored separately. Once they're mixed together, you can no longer tell which thoughts are yours and which were organized by AI.

After using them together for a while, I started feeling a subtle wrongness I couldn't quite name — a kind of fuzziness, a certain… indifference?

Eventually I understood: what AI organizes is the statistical output of data. What I distill myself carries the context of the moment, the confusion, even the instinctively wrong intuitions — but that messiness is _mine_, and it still has value.

Mixing the two isn't an efficiency gain. It's a dilution of thinking — and you won't easily notice it happening.

There's another subtler issue: if your notebook is full of perfect answers written by the teacher (AI), over time you'll stop daring to write down your own rough scribbles — or you'll mistakenly believe you've already reached that level of understanding. But that was AI, not you.

In practice there are finer ways to manage this boundary — keeping the AI workspace and the personal reflection space more clearly separate. If anyone's interested, I'll write a deeper piece on that separately.

---

When it comes to collecting information, my personal threshold is low: if something in the moment makes me think _"hm, that's interesting"_, I write it down. No worrying about format or category — capture first, sort later.

A lot of people think the hardest part of a notes system (or a "second brain") is organizing. It's not. The hardest part is being willing to capture something before you've fully thought it through. Organization comes later. That "hm" moment — once it passes, it doesn't come back.

As for whether that "hm" is actually useful, or whether it connects to existing knowledge — I don't let AI make that call entirely. I go back to Obsidian and think it through myself.

This is where another small tool I built comes in: [**vault-search**](https://github.com/notoriouslab/vault-search), an Obsidian plugin (which I also open-sourced yesterday — currently waiting for official community plugin approval) that runs semantic search locally via Ollama. My favorite thing about it: the more descriptive your search query, the more relevant notes surface. And articles can find similar notes with a single click.

Technically AI could do all of this, and integrate even more deeply. AI development is fast — it can already be trained to closely approximate your own voice. But I choose to do this myself, because the thinking is already happening _during_ the searching and reading. Finding a relevant note, reading it, then finding the next one — that process _is_ the digestion. If I let AI hand me conclusions directly, I save time, but I also skip the thinking.

AI expands my field of view. The judgment is still mine.

---

Over the years I've loved creating categories — by type, by year, by nature — thinking it would help with data management. But Obsidian's real strength isn't folders. It's the tags and descriptions in YAML frontmatter, combined with bidirectional links.

Folders are tree structures — one article, one location. Tags and bidirectional links are graph structures — one article can belong to multiple contexts simultaneously. Once knowledge accumulates to a certain scale, graphs are far more flexible than trees, and the anxiety of "does this go in A or B?" largely disappears.

The process of organizing is itself a process of clarifying your own conceptual boundaries — which terms mean the same thing to you, which lines of thinking have subtle differences. Letting AI make all of those calls for you is actually a bit of a shame.

Folders are still useful, just not the core of the system. Thinking is.

---

Back to the original question: I'm a heavy AI user too. Reading Karpathy's article, I found his thinking genuinely powerful. Lex Fridman running while having voice conversations with AI, asking questions mid-stride — that's undeniably cool. But they share something in common: AI helps them organize the world, but _they're_ still the ones asking the questions and making the judgments.

Back to the kitchen analogy: no matter how good a microwave is, it can't slow-cook a broth. Not because the technology isn't there — but because the slow, patient process is itself part of the flavor.

Steph Ango's "store them separately" comes down to exactly this: give the AI its space to run, keep your own space for yourself. Draw the boundary clearly, and both sides can do their best work.

The library can be built, maintained, and expanded by AI — but there is one position AI cannot fill: the person standing in front of the shelves, deciding what a book means _to them_.

---

Amid all the complex Skills and impressive workflow trends, maybe it's okay to slow down. You don't have to start with something complicated.

Just do one thing: create a **raw folder**, and throw everything that makes you think _"hm, that's interesting"_ into it. Don't organize it.

Obsidian with the Web Clipper plugin works. So does Notion. Even a Google Keep label, or Apple's built-in Notes app. The tool doesn't matter — the habit does.

Once enough accumulates, feed it to AI to organize. Let AI show you connections you might have missed on your own. But the final question — _"what does this mean to me?"_ — leave that one for yourself.

Reserve a place in yourself that AI cannot replace. That question is worth sitting with slowly, savoring the process.

---

# 在 AI 圖書館中，你站在哪裡？(中文版)

在 [Karpathy](https://x.com/karpathy) 發了那篇  AI 知識庫的文章並且開源了他的方法論之後，很多人開始在學習和分享：「我要怎麼把 AI 變成自己的圖書館？」

但我想從另一個角度來聊這件事：**在這座浩瀚的 AI 圖書館中，你打算站在哪裡？** 不是館長，不是讀者，而是 -- 你打算讓自己消失在裡面，還是留著？

-----

## 從自架主機到 Markdown

我很早就開始在網路上寫文章，年輕的時候自己架主機、搞網站，後來換到 Google Blogger，用過各種平台，但回頭看，其實滿多東西就這樣不見了，不是壞掉，是消失，平台關掉、格式過時、帳號出問題⋯ 不見得真的失去什麼了不起東西，但就是 ... 沒了。

去年開始花了一些時間，陸續把所有東西清洗成 Markdown 格式。還搞了一個叫 [doc-cleaner](https://github.com/notoriouslab/doc-cleaner) 的開源小工具來處理這件事：把 PDF、DOCX、XLSX 批次轉成乾淨的 Markdown，中文友好、表格友好、隱私優先，清洗完，用 GitHub Pages 架站，將知識庫和網站合一。

現在我的文章、我的筆記、我的網站，全部是純文字的 `.md` 檔，住在自己的 repo 裡，知道它們在哪裡，也知道它們不太會突然不見。

這個改變，也讓我思想自己的整套 AI 工作流有了一個很清楚的原則：**工具可以換，格式不能被鎖死，資料要留在自己手裡。**

-----

## 關於 AI ：科技快速調理區、發酵桶與儲藏室

我愛吃，所以習慣用廚房來想這些事情 ，哈。

**AI / LLM（快）** 是我的科技調理區，有最好的料理工具處理當下正在用的食材。我用 LLM + [CMUX](https://cmux.com/zh-TW) 當工作環境，CMUX 讓我在終端機裡很方便地取用 MD 格式資料，做過 register 之後速度很快，也很容易加上調研最新的資訊，讓料理更富特色。

**Obsidian（慢）** 是發酵桶、是慢燉鍋，需要時間沉澱，慢慢來，那是 AI 代替不了的風味。這裡是我的沉澱角落，放那些已經想過了的東西。

**Markdown 文件（基礎）** 是家裡的儲藏室。不管換了哪個鍋子、哪套工具，食材都在那裡，格式不被任何平台綁死。

三者之間的橋樑就是 Markdown 本身。處理後的心得或新想法，從工作環境回寫到 Obsidian 這一側；Obsidian 裡沉澱好的東西，隨時可以被工作環境取用。

曾經有一段時間把兩邊整合在一起，大量使用工具自動化分解重組資料，覺得也挺順。

然後又把它們拆開了。哈哈。

-----

## 為什麼合了順了還要拆？

Obsidian 創辦人 [Steph Ango](https://stephango.com/) 說了一段話，我覺得說得很有意思：**你自己的筆記和 AI 產出的知識庫，應該分開存放。** 一旦混在一起，你再也分不清哪些是自己的想法、哪些是 AI 整理出來的。

我用了一段時間後，確實出現了一些違和感，說不上哪裡不對，就是有點模糊和 ... 不在意？

後來想清楚了：**AI 整理出來的東西，是資料的統計結果。我自己沉澱出來的東西，帶著當時的脈絡、疑惑、哪怕是直覺上的錯誤，但這些混亂才是我的，也依然是有價值的部分。**

兩者混在一起，不是效率提升，是思考容易被稀釋，而且你不太會發現。

還有另一件更微妙的事：**如果你的筆記本裡全是老師（AI）寫的完美答案，久了你就不敢寫下自己的塗鴉，或是誤以為自己已經到那個點，但其實那是 AI，不是你啊。**

實務上有一些更細的邊界管理方式，例如把 AI 工作區和個人沉澱角落分得更清楚，如果有人有興趣，之後再另外寫一篇深入版來聊 XD

-----

## 「咦，有點意思」就夠了

關於資訊採納收集這件事，我個人的門檻很低：**只要當下覺得「咦，有點意思」，就寫進來。**

不管格式，不管分類，先存再說。

很多人以為筆記系統（或第二大腦）最難的是整理，其實不是，最難的是你願不願意在還沒想清楚的時候就先把東西留下來。整理是後來的事，那個「咦」的瞬間，過了就不回來了。

至於這個「咦」到底有沒有用、跟過往的知識有沒有強關聯，我不讓 AI 來全權判斷，我自己回到 Obsidian 去想。

這裡用上了另一個自己寫的小工具：[vault-search](https://github.com/notoriouslab/vault-search)，一個 Obsidian 外掛（昨天也順手開源了），用本地 Ollama 跑語意搜尋，我最喜歡的是當搜尋的時候，越多的描述會找出越相關的筆記，文章也可以一鍵找到相似筆記。

這些技術上 AI 都能做，甚至整合的更深，而且 AI 的發展迅速，已經可以訓練到近似自己的風格，但我選擇自己來，因為**在搜尋和閱讀的過程裡，思考已經在發生了**。找到一篇相關筆記、讀一讀、再找下一篇，這個過程本身就是消化，讓 AI 直接給我結論，我省掉了時間，也省掉了思考。

AI 幫我擴大視野，判斷是我自己的事。

-----

## 順帶一提：資料夾分類沒你想的重要

我這些年很喜歡設分類（按類別，按年份，按性質⋯），想說便於資料管理。但其實 Obsidian 最強的不是資料夾，是 YAML frontmatter 裡的 tag、description，加上雙向連結的知識連結。

資料夾是樹狀結構，一篇文章只能放一個地方。Tag 和雙向連結是圖狀結構，一篇文章可以同時屬於多個脈絡，當知識累積到一定規模，圖比樹靈活太多了，「這篇到底放 A 還是 B」這種問題也沒這麼糾結了。

而且——**你在整理的過程，本身就是在釐清自己的概念邊界，** 哪些詞對你來說是同一件事、哪些思路其實有微妙差異，這個判斷讓 AI 全部替你做掉，反而有點可惜。

資料夾分類還是很好用，但不會是系統的核心，思考才是。

-----

## 在圖書館裡，你站在哪裡？

回到一開始的問題，我也是 AI 重度使用者，看到 Karpathy 的文章也覺得他的思維很強大，Lex Fridman 跑步時用語音跟 AI 對話、邊跑邊問問題，感覺也超酷，但他們有個共同點是：**AI 幫他們整理世界，但問問題和做判斷的還是他們自己。**

回到廚房的比喻：再好的微波爐，也燉不出老火湯的味道，不是因為技術不夠，是因為那個慢下來的過程本身就是風味的一部分。

Steph Ango 說的「分開存放」，底層邏輯就是這個：**給 AI 的區域讓它跑，給自己的區域留給自己，** 邊界畫清楚，兩邊才都能發揮最大的價值。

圖書館可以讓 AI 幫你蓋、幫你維護、幫你擴張，但有一個位置，是 AI 填不進去的：

**站在書架前，決定這本書對你意味著什麼的那個人。**

-----

## 換個思維更輕省

在許多複雜的 Skill 、厲害的工作流潮流下，或許可以慢一點，不需要從複雜的事開始。

只做一件事：**建一個「原始資料夾」，把你覺得「咦，有點意思」的東西通通丟進去，不要整理。**

Obsidian 加上 Web Clipper 外掛可以做到，Notion 也行，甚至一個 Google Keep 的標籤，Apple 內建的備忘錄也行，工具不重要，習慣比較重要。

等積累了一定量之後，再把它們丟給 AI 整理，讓 AI 幫你看有沒有你自己沒注意到的關聯，但最後那個「這對我有什麼意義」的問題，留給自己來回答。

替自己留一個不被 AI 取代的位置，這個問題，值得慢慢來、慢慢體會，享受過程～