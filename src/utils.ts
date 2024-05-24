// import { DateTime, Zone } from 'luxon';

// function getDatesRange(dateFrom: number, dateTo: number): string[] {
//     const range: string[] = [];
    
//     if (dateFrom > 0 && dateFrom <= dateTo) {
//         const startDate = DateTime.fromSeconds(dateFrom, { zone: 'UTC' }).startOf('month');
//         const endDate = DateTime.fromSeconds(dateTo, { zone: 'UTC' }).endOf('month');
        
//         let formattedDate: string = "";
//         for (let date = startDate; date < endDate; date = date.plus({ months: 1 })) {
//             formattedDate = date.toFormat('yyyy-MM');
//             range.push(formattedDate);
//         }
//     }
    
//     return range;
// }