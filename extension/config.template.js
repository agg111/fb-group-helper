// Personal intro message configuration template
// Rename this file to config.js and customize your intro message
// The config.js file will be ignored by git and won't be pushed to GitHub

const introMessage = `\n\n[YOUR INTRO MESSAGE HERE]

Example:
I am into tech. I just moved to SF a month back. 
I commute to office three times a week mostly by bart or bus. 

I am down for a facetime, or a quick in-person tour, let me know!`;

// Export for use in content.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { introMessage };
} else {
    window.introMessage = introMessage;
}
