











export const formatDate = (dateString?: string | null, options?: Intl.DateTimeFormatOptions): string => {
    if (!dateString) return "N/A";
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) throw new Error("Invalid date value");
        const defaultOptions: Intl.DateTimeFormatOptions = {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        };
        return date.toLocaleDateString("de-DE", { ...defaultOptions, ...options });
    } catch (e) {
        console.error("Error in formatDate:", e, "Original input:", dateString);
        return "Datumsfehler";
    }
};

export const formatTime = (timeString?: string | null): string => {
    if (!timeString || timeString.toLowerCase() === "invalid date") return "N/A";
    try {
        if (/^\d{2}:\d{2}(:\d{2})?$/.test(timeString)) {
            return timeString.substring(0, 5);
        }
        let date = new Date(`1970-01-01T${timeString}`);
        if (isNaN(date.getTime())) {
            date = new Date(timeString);
        }
        if (isNaN(date.getTime())) {
            console.error("Invalid time value after multiple parsing attempts:", timeString);
            return "Zeitfehler";
        }
        return date.toLocaleTimeString("de-DE", {
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch (e) {
        console.error("Error in formatTime:", e, "Original input:", timeString);
        return "Zeitfehler";
    }
};

export const formatDateTime = (dateTimeString?: string | null): string => {
  if (!dateTimeString) return "N/A";
  try {
    const date = new Date(dateTimeString);
    if (isNaN(date.getTime())) {
        console.error("Invalid dateTime value in formatDateTime:", dateTimeString);
        return "Ungültiges Datum/Zeit";
    }
    // Das Suffix " Uhr" wurde entfernt
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (e) {
    console.error("Error in formatDateTime:", e, "Original input:", dateTimeString);
    return "Formatierungsfehler";
  }
};

export const formatLastUpdateTime = (timestamp: Date | null): string => {
    if (!timestamp) return "N/A";
    // Das Suffix " Uhr" wurde hier ebenfalls entfernt für Konsistenz, falls gewünscht
    return timestamp.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};





