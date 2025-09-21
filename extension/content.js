console.log("✅ FB Group Post Detector active now! Let's go!");

const processedPosts = new WeakSet();
let introMessage = "";
let criteriaCache = null;

// Queue + batching
let postQueue = [];
let processing = false;
const INITIAL_BATCH = 5;
const BATCH_SIZE = 2;

// Load intro message
try {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('config.js');
    script.onload = function () {
        introMessage = window.introMessage || "";
        console.log("✅ Intro message loaded from config.js");
    };
    script.onerror = function () {
        console.warn("⚠️ config.js not found, using default intro message");
        introMessage = "\n\n Happy to do on a quick call, let me know!";
    };
    document.head.appendChild(script);
} catch (error) {
    console.error("Error loading config.js:", error);
    introMessage = "\n\n Happy to do on a quick call, let me know!";
}

// Selector for posts
const postSelector = 'div[class^="x1yztbdb"]';

// Inject UI button + LLM insights
function injectMessageUI(postNode, llmResult) {
    if (postNode.querySelector('.fb-helper-box')) return;

    const box = document.createElement("div");
    box.className = "fb-helper-box";
    box.style.background = "transparent";
    box.style.padding = "6px";
    box.style.marginTop = "6px";
    box.style.borderRadius = "8px";
    box.style.fontSize = "14px";

    const btn = document.createElement("button");
    btn.innerText = "💬 Generate Reply";
    btn.style.cursor = "pointer";
    btn.style.background = "#1877f2";
    btn.style.color = "white";
    btn.style.border = "none";
    btn.style.padding = "4px 8px";
    btn.style.borderRadius = "6px";

    btn.addEventListener("click", () => {
        llmResult.suggestedMessage = llmResult.suggestedMessage + introMessage;
        navigator.clipboard.writeText(llmResult.suggestedMessage);
        alert(`✅ Message copied!\n\n${llmResult.suggestedMessage}`);
    });

    const insights = document.createElement("div");
    insights.className = "fb-helper-insights";
    insights.style.marginTop = "4px";
    insights.style.fontSize = "13px";
    insights.style.color = "#888";
    insights.innerText = `Match: ${llmResult.confidence}% | Good: ${llmResult.good} | Bad: ${llmResult.bad}`;

    box.appendChild(btn);
    box.appendChild(insights);
    postNode.appendChild(box);
    console.log("✅ Button + LLM insights injected into post");
}

// Process a single post
async function processPost(post) {
    if (processedPosts.has(post)) return;
    processedPosts.add(post);

    const contentNodes = post.querySelectorAll('div[dir="auto"], span[dir="auto"]');
    const meaningfulText = Array.from(contentNodes)
        .map(n => n.innerText.trim())
        .filter(t => t.length > 10 && !/facebook|like|reply|share/i.test(t))
        .join(" ");

    if (!meaningfulText) return;

    console.log("Processing post:", meaningfulText.slice(0, 50));

    try {
        const res = await fetch("http://127.0.0.1:8000/analyzePost", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ postText: meaningfulText, criteria: criteriaCache })
        });
        const llmResult = await res.json();

        if (!llmResult || llmResult.error) {
            console.log("LLM error:", llmResult?.error);
            return;
        }

        injectMessageUI(post, llmResult);
    } catch (err) {
        console.error("Error calling backend:", err);
    }
}

// Queue posts for batched processing
function queuePost(post) {
    postQueue.push(post);
    processQueue();
}

async function processQueue() {
    if (processing) return;
    processing = true;

    while (postQueue.length > 0) {
        const batch = postQueue.splice(0, BATCH_SIZE);
        await Promise.all(batch.map(processPost));
        await new Promise(resolve => setTimeout(resolve, 400)); // small delay
    }

    processing = false;
}

// Observe posts as they scroll into view
function watchPosts(posts) {
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                queuePost(entry.target);
                observer.unobserve(entry.target); // process once
            }
        });
    }, { rootMargin: "300px" });

    posts.forEach(post => observer.observe(post));
}

// Process feed lazily
function processFeed() {
    const feed = document.querySelector('div[role="feed"]');
    if (!feed) {
        console.error("❌ Feed container not found!");
        return;
    }

    chrome.storage.local.get('criteria', ({ criteria }) => {
        if (!criteria) {
            console.warn("⚠️ No criteria found");
            return;
        }

        criteriaCache = criteria; // cache once

        const posts = Array.from(feed.querySelectorAll(postSelector))
            .filter(p => !processedPosts.has(p));

        console.log(`📌 Found ${posts.length} potential posts in feed`);

        // Observe all posts but only process first N immediately
        const initialPosts = posts.slice(0, INITIAL_BATCH);
        const lazyPosts = posts.slice(INITIAL_BATCH);

        initialPosts.forEach(queuePost);
        watchPosts(lazyPosts);
    });
}

// Initial run
processFeed();

// Watch for new posts being added
const feed = document.querySelector('div[role="feed"]');
if (feed) {
    const observer = new MutationObserver(() => {
        console.log("👀 Mutation detected, reprocessing feed...");
        processFeed();
    });

    observer.observe(feed, { childList: true, subtree: true });
    console.log("👁️ Observer attached to feed");
}
