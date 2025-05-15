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