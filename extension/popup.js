document.addEventListener('DOMContentLoaded', () => {
    const locationsInput = document.getElementById('locations');
    const budgetInput = document.getElementById('budget');
    const roomTypeInput = document.getElementById('roomType');
    const moveInDateInput = document.getElementById('moveInDate');
    const saveBtn = document.getElementById('saveBtn');

    // Load saved criteria
    chrome.storage.local.get('criteria', ({criteria}) => {
        if (criteria) {
            locationsInput.value = criteria.location.join(", ");
            budgetInput.value = criteria.maxBudget;
            roomTypeInput.value = criteria.roomType;
            moveInDateInput.value = criteria.moveInDate;
        }
    });

    saveBtn.addEventListener('click', () => {
        const criteria = {
            location: locationsInput.value.split(",").map(s => s.trim()),
            maxBudget: parseFloat(budgetInput.value),
            roomType: roomTypeInput.value,
            moveInDate: moveInDateInput.value
        };
        chrome.storage.local.set({criteria}, () => {
            alert("✅ Criteria saved!");
        });
    });
});
