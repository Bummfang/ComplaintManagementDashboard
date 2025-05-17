// app/utils.ts
export const formatDate = (dateString?: string, options?: Intl.DateTimeFormatOptions): string => {
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
        console.log(e);
        return dateString;
    }
};

export const formatTime = (timeString?: string): string => {
    if (!timeString || timeString.toLowerCase() === "invalid date") return "N/A";
    try {
        if (/^\d{2}:\d{2}(:\d{2})?$/.test(timeString)) {
            return timeString.substring(0, 5);
        }
        const date = new Date(`1970-01-01T${timeString}`);
        if (isNaN(date.getTime())) {
            const fullDate = new Date(timeString);
            if(isNaN(fullDate.getTime())) return timeString;
            return fullDate.toLocaleTimeString("de-DE", {
                hour: "2-digit",
                minute: "2-digit",
            });
        }
        return date.toLocaleTimeString("de-DE", {
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch (e) {
        console.log(e);
        return timeString;
    }
};

export const formatLastUpdateTime = (timestamp: Date | null): string => {
    if (!timestamp) return "N/A";
    return timestamp.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};