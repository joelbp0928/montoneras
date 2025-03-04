// validarFecha.js
export function isValidDate(dateString) {
    const today = new Date();
    const dateParts = dateString.split('-');
    const year = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1; // Restamos 1 porque los meses en JavaScript son 0-indexados
    const day = parseInt(dateParts[2], 10);
  
    const isValidFormat = /^\d{4}-\d{2}-\d{2}$/.test(dateString);
    const isValidDate = !isNaN(year) && !isNaN(month) && !isNaN(day);
    const isDifferenceMoreThanFiveYears = (today - new Date(year, month, day)) >= (1000 * 60 * 60 * 24 * 365 * 5);

    return isValidFormat && isValidDate  && isDifferenceMoreThanFiveYears;
  }
  