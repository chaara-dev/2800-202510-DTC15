async function loadReminders() {
    try {
        const res = await fetch("/reminders")
        const reminders = await res.json();

        const container = document.getElementById("reminderMainSection")
        container.innerHTML = ""

        const now = new Date()
        let soonestTime = null
        let soonestDiff = Infinity

        reminders.forEach(reminder => {
            const [hours, minutes] = reminder.timeOfDay.split(":").map(Number);
            const now = new Date();
            let firstReminder = new Date(now)
            firstReminder.setHours(hours, minutes, 0, 0)

            if (firstReminder < now) {
                firstReminder.setDate(firstReminder.getDate() + 1)
            }

            const firstTimeout = firstReminder.getTime() - now.getTime()

            setTimeout(() => {
                alert(`Reminder: ${reminder.action} ${reminder.plantName}!`)

                setInterval(() => {
                    alert(`Reminder: ${reminder.action} ${reminder.plantName}`)
                }, 24 * 60 * 60 * 1000);
            }, firstTimeout);

            if (firstTimeout < soonestDiff) {
                soonestDiff = firstTimeout;
                soonestTime = firstReminder;
            }

            const div = document.createElement("div");
            div.className = "reminder-body";
            div.innerHTML = `
                <img src="../Resources/Icons/notifications.png">
                <span class="reminderAction">${reminder.action}</span>
                &nbsp;
                <span class="reminderName">${reminder.plantName}</span>
                &nbsp;
                <span class="reminderTime">${reminder.timeOfDay}</span>
                <label class="reminder-toggle"><input type="checkbox" /></label>
            `;
            container.appendChild(div);
        });

        if (soonestTime) {
            const diffMins = Math.floor(soonestDiff / 60000);
            const h = Math.floor(diffMins / 60);
            const m = diffMins % 60;
            document.getElementById("nextReminder").textContent = `${h} hour${h !== 1 ? "s" : ""} ${m} minute${m !== 1 ? "s" : ""}`;
        } else {
            document.getElementById("nextReminder").textContent = "No reminders set";
        }
    } catch (err) {
        console.error("Failed to load reminders", err);
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