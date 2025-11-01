export const formatDateWithoutTime = (date: string | number | Date): string => {
    return new Date(date).toLocaleString('en-US', {
        month: 'short',  // e.g. "Aug"
        day: 'numeric',  // e.g. "16"
        weekday: 'short' // e.g "Wed"
        // year: 'numeric', 
        // hour: 'numeric',  
        // minute: 'numeric', 
        // hour12: true 
    });
};

export const formatDate = (date: string | number | Date): string => {
    return new Date(date).toLocaleString('en-US', {
        month: 'short',  // e.g. "Aug"
        day: 'numeric',  // e.g. "16"
        year: 'numeric', // e.g. "2022"
        hour: 'numeric',  // e.g. "10"
        minute: 'numeric', // e.g. "23"
        hour12: true  // e.g. "10:23 AM"
    });
};

// export const formatAmount = (amount: number): string => {
//     return amount.toLocaleString('en-US');
// };

export const formatAmount = (amount: number) => {
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    };