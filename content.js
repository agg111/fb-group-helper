console.log("✅ FB Group Post Detector active now! Let's get started!");

const processedPosts = new WeakSet();

// Robust selector for posts (first class in your inspection)
const postSelector = 'div[class^="x1yztbdb"]';

// Simple keyword match
function matchesCriteria(text) {
    return /looking for|recommend|roommates|sublease/i.test(text);
}

// Inject Generate Reply button
function injectMessageUI(postNode, text) {
    if (postNode.querySelector('.fb-helper-box')) return;

    const box = document.createElement("div");
    box.className = "fb-helper-box";
    box.style.background = "#f0f2f5";
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
        const msg = generateMessage(text);
        navigator.clipboard.writeText(msg);
        alert("✅ Message copied to clipboard:\n\n" + msg);
    });

    box.appendChild(btn);
    postNode.appendChild(box);
}

// Simple message template
function generateMessage(postText) {
    const trimmed = postText.slice(0, 100).replace(/\s+/g, ' ');
    return `Hey! I saw your post: "${trimmed}..." – happy to get on a quick call, let me know!`;
}

// Process a single post
function processPost(post) {
    if (processedPosts.has(post)) return;
    processedPosts.add(post);

    const text = post.innerText || "";
    console.log("Processing post text (first 50 chars):", text.slice(0,50));

    if (matchesCriteria(text)) {
        console.log("✅ Post matches criteria, injecting button");
        injectMessageUI(post, text);
    } else {
        console.log("Post does NOT match criteria");
    }
}

// Process all posts in feed
function processFeed() {
    const feed = document.querySelector('div[role="feed"]');
    if (!feed) {
        console.error("Feed container not found!");
        return;
    }

    const posts = Array.from(feed.querySelectorAll(postSelector))
        .filter(p => p.innerText && p.innerText.trim().length > 20);

    console.log(`Found ${posts.length} posts in feed`);
    posts.forEach(processPost);
}

// --- Initial load ---
processFeed();

// --- Observe feed for new posts ---
const feed = document.querySelector('div[role="feed"]');
if (feed) {
    const observer = new MutationObserver(mutations => {
        console.log("Observer detected mutation:", mutations.length, "mutations");
        processFeed(); // Always process entire feed, not individual nodes
    });

    observer.observe(feed, { childList: true, subtree: true });
    console.log("Observer attached to feed");
}
