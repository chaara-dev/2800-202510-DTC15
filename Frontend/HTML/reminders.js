async function loadReminders() {
    try {
        const res = await fetch("/reminders")
        const reminders = await res.json();

        const container = document.getElementById("reminderMainSection")
        container.innerHTML = ""

        const now = new Date()

        reminders.forEach(reminder => {
            const reminderTime = new Date(reminder.time);

            const div = document.createElement("div");
            div.className = "reminder-body";
            div.innerHTML = `
        <img src="../Resources/Icons/notifications.png">
        <span class="reminderAction">${reminder.action}</span>
        &nbsp;
        <span class="reminderName">${reminder.plantName}</span>
        &nbsp;
        <span class="reminderTime">${reminderTime.toLocaleString()}</span>
        <label class="reminder-toggle"><input type="checkbox" /></label>
      `;
            container.appendChild(div)

            const timeDiff = reminderTime.getTime() - now.getTime();
            if (timeDiff > 0) {
                setTimeout(() => {
                    alert(`Reminder: ${reminder.action} ${reminder.plantName}`);
                }, timeDiff);
            }
        });
    } catch {
        console.error("Something went wrong. Failed to load reminders.")
    }
}

async function addReminderPrompt() {
    const plantName = prompt("Enter plant name:")
    if (!plantName) return

    const action = prompt("Enter action (e.g., Water, Prune):");
    if (!action) return;

    const timeOfDay = prompt("Enter time to be reminded (24h format: HH:mm):")
    if (!/^\d{2}:\d{2}$/.test(timeOfDay)) {
        alert("Invalid time format. Use HH:mm");
        return;
    }

    try {
        const res = await fetch("/reminders", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ plantName, action, timeOfDay })
        });

        if (!res.ok) throw new Error("Failed to add reminder");
        await loadReminders();
    } catch (err) {
        console.error("Error adding reminder:", err);
        alert("Failed to add reminder.");
    }
}