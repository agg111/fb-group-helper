console.log("✅ FB Group Post Detector active now! Let's go!");

const processedPosts = new WeakSet();

// Load default intro message telling about yourself from config file
let introMessage = "";
try {
    // Try to load from config.js
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('config.js');
    script.onload = function() {
        introMessage = window.introMessage || "";
        console.log("✅ Intro message loaded from config.js");
    };
    script.onerror = function() {
        console.warn("⚠️ config.js not found, using default intro message");
        introMessage = "\n\n Happy to do on a quick call, let me know!";
    };
    document.head.appendChild(script);
} catch (error) {
    console.error("Error loading config.js:", error);
    introMessage = "\n\n Happy to do on a quick call, let me know!";
}


// Selector for posts — use stable class prefix you observed
const postSelector = 'div[class^="x1yztbdb"]';

// Keyword match (can expand later)
function matchesCriteria(text) {
    return /looking for|recommend|roommates|sublease/i.test(text);
}

// Inject UI button, LLM insights
function injectMessageUI(postNode, llmResult) {
    if (postNode.querySelector('.fb-helper-box')) return;

    // Container for button + insights
    const box = document.createElement("div");
    box.className = "fb-helper-box";
    box.style.background = "transparent"; // works with dark/light mode
    box.style.padding = "6px";
    box.style.marginTop = "6px";
    box.style.borderRadius = "8px";
    box.style.fontSize = "14px";

    // Generate Reply button
    const btn = document.createElement("button");
    btn.innerText = "💬 Generate Reply";
    btn.style.cursor = "pointer";
    btn.style.background = "#1877f2";
    btn.style.color = "white";
    btn.style.border = "none";
    btn.style.padding = "4px 8px";
    btn.style.borderRadius = "6px";

    btn.addEventListener("click", () => {
        // append to the suggested message
        llmResult.suggestedMessage = llmResult.suggestedMessage + introMessage;
        navigator.clipboard.writeText(llmResult.suggestedMessage);
        alert(`✅ Message copied!\n\n${llmResult.suggestedMessage}`);
    });

    // Insights div
    const insights = document.createElement("div");
    insights.className = "fb-helper-insights";
    insights.style.marginTop = "4px";
    insights.style.fontSize = "13px";
    insights.style.color = "#888";
    insights.innerText = `Match: ${llmResult.matchScore}% | Good: ${llmResult.good} | Bad: ${llmResult.bad}`;

    box.appendChild(btn);
    box.appendChild(insights);
    postNode.appendChild(box);
    console.log("✅ Button + LLM insights injected into post");
}


function generateMessage(postText) {
    const trimmed = postText.slice(0, 100).replace(/\s+/g, ' ');
    return `Hey! I saw your post: "${trimmed}..." – happy to get on a quick call, let me know!`;
}

function isCommentBlock(postNode) {
    // Quick heuristic: if it has a "Reply" button or is inside a comments container
    const text = postNode.innerText.toLowerCase();
    if (postNode.closest('[aria-label="Comments"]')) return true;
    if (text.includes("like") && text.includes("reply") && text.length < 200) return true;
    return false;
}

// Process post
async function processPost(post, criteria) {
    if (processedPosts.has(post)) return;
    processedPosts.add(post);

    const contentNodes = post.querySelectorAll('div[dir="auto"], span[dir="auto"]');
    const meaningfulText = Array.from(contentNodes)
        .map(n => n.innerText.trim())
        .filter(t => t.length > 10 && !/facebook|like|reply|share/i.test(t))
        .join(" ");

    if (!meaningfulText) return;

    console.log("Processing post:", meaningfulText.slice(0,50));

    try {
        const res = await fetch("http://127.0.0.1:8000/analyzePost", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ postText: meaningfulText, criteria })
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


// Fetch all posts from feed
function processFeed() {
    const feed = document.querySelector('div[role="feed"]');
    if (!feed) {
        console.error("❌ Feed container not found!");
        return;
    }

    chrome.storage.local.get('criteria', ({criteria}) => {
        if (!criteria) return console.warn("⚠️ No criteria found");
    
        const feed = document.querySelector('div[role="feed"]');
        if (!feed) return;
    
        // Process existing posts
        const posts = Array.from(feed.querySelectorAll(postSelector));
        posts.forEach(post => processPost(post, criteria));
    
        // Observe feed for new posts
        const observer = new MutationObserver(() => {
            const newPosts = Array.from(feed.querySelectorAll(postSelector))
                .filter(p => !processedPosts.has(p));
            newPosts.forEach(post => processPost(post, criteria));
        });
        observer.observe(feed, { childList: true, subtree: true });
    });
}


// Initial processing
processFeed();

// Observe feed for changes and re-run
const feed = document.querySelector('div[role="feed"]');
if (feed) {
    const observer = new MutationObserver(() => {
        console.log("👀 Mutation detected, reprocessing feed...");
        setTimeout(processFeed, 200); // small delay to allow FB DOM render
    });

    observer.observe(feed, { childList: true, subtree: true });
    console.log("👁️ Observer attached to feed");
}
