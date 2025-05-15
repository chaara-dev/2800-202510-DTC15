async function loadReminders() {
    try {
        const res = await fetch("/reminders")
        const reminders = await res.json();

        const container = document.getElementById("reminderMainSection")
        container.innerHTML = ""

        const now = new Date()

        reminders.forEach(reminder => {
            const reminderTime = new Date(reminder.time);
        });
    } catch {

    }
}