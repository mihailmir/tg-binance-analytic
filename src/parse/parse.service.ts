import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ParseService {
  private readonly logger = new Logger(ParseService.name);
  private readonly targetCurrency = "USDT";
  constructor() {}

  parseSignal = async () => {
  }

  // isNeedToParse = (message: string): boolean =>  {
  //     if (message.includes('imeframe:')) {
  //       return true;
  //     }
  //   return false;
  // }

  getPair = (message: string): string | null => {
    const regex = new RegExp(`(?:\\b|#)([A-Z]+)\\s*\\/?\\s*${this.targetCurrency}\\b`, 'i'); //regex pars value befoure target currency
    const match = message.match(regex);

    if (match) {
      return `${match[1].toUpperCase()}${this.targetCurrency}`;
    }

    return null;
  }
}



// import fs from 'fs';
// import path from 'path';
// import { parse } from 'json2csv';
// import moment from 'moment';
// import dotenv from 'dotenv';
// import {
//   PriceHistory,
//   Signal,
//   Direction
// } from '../objects';
// import {
//   FileNamesDatabase,
//   TradeSignalsDatabase
// } from '../database';
// import {
//   DownloadPriceHistoryFromBinance
// } from '../files';
// import {
//   DateFormatter
// } from '../format';
// import {
//   Logs,
//   TimeTracking
// } from '../logs';
// import {
//   GlobalParameters
// } from '../param';
// import {
//   SignalParser,
//   Binance360,
//   CryptoAmanSignalParser,
//   DavidSmithSignalParser,
//   DefaultSignalParser,
//   SKIPEDAltSignalsFuturesParser,
//   SKIPEDFortuneVipParser,
//   Vilarso15mSignalParser
// } from '../parsingSignals';
// import {
//   MainTester
// } from '../testers';

// dotenv.config();

// export class ParseData {
//   public static readonly MINUTE = 60;

//   public static parsePriceHistoryOf(pair: string): PriceHistory {
//     const datesRange = this.getDatesRange(pair);
//     this.autoDownloadPriceHistory(pair, datesRange);

//     const history = new PriceHistory(pair);
//     this.parsePriceHistoryOfDates(datesRange, history);

//     return history;
//   }

//   private static parsePriceHistoryOfDates(datesRange: string[], history: PriceHistory): void {
//     TimeTracking.start('parseHistoryPrices');
//     const fileNames = FileNamesDatabase.getHistoryFileNamesOf(history.getPair());

//     if (fileNames) {
//       Logs.print(`Parse Price history months - ${datesRange}`);
//       fileNames.forEach(fileName => {
//         if (datesRange.includes((fileName as HistoryFileName).getDate())) {
//           this.parseHistoryPrices(fileName.getPathName(), history);
//         }
//       });
//     }
//     TimeTracking.end('parseHistoryPrices');

//     if (history.isEmpty()) {
//       Logs.error(`Can't parse price history of ${history.getPair()} - ${datesRange}`, 'PRICE_HISTORY PARSER');
//       Logs.unknownPair(history.getPair());
//     }
//   }

//   private static autoDownloadPriceHistory(pair: string, datesRange: string[]): void {
//     TimeTracking.start('AutoDownload');
//     if (GlobalParameters.isAutoDownloadPriceHistoryNeeded()) {
//       const excludeRange = FileNamesDatabase.getPriceHistoryDatesRangeOf(pair);
//       const datesRangeToDownload = datesRange.filter(v => !excludeRange.includes(v));
//       this.downloadPriceHistory(pair, datesRangeToDownload);
//     }
//     TimeTracking.end('AutoDownload');
//   }

//   private static downloadPriceHistory(pair: string, datesRangeToDownload: string[]): void {
//     if (datesRangeToDownload.length > 0) {
//       DownloadPriceHistoryFromBinance.download(pair, datesRangeToDownload);
//       FileNamesDatabase.updateHistoryFileNames();
//     }
//   }

//   private static getDatesRange(pair: string): string[] {
//     const globalRange = DateFormatter.getDatesRange(GlobalParameters.getDateFrom(), GlobalParameters.getDateTo());
//     const signalRange = DateFormatter.getDatesRange(TradeSignalsDatabase.getMinDate(), TradeSignalsDatabase.getMaxDate());
//     return globalRange.filter(date => signalRange.includes(date));
//   }

//   public static parseNextMonthToPriceHistory(priceHistory: PriceHistory): void {
//     const from = priceHistory.getMaxDate() + this.MINUTE;
//     const datesRange = DateFormatter.getDatesRange(from, from);
//     const pair = priceHistory.getPair();
//     this.autoDownloadPriceHistory(pair, datesRange);
//     this.parsePriceHistoryOfDates(datesRange, priceHistory);
//   }

//   private static parseHistoryPrices(fileName: string, history: PriceHistory): void {
//     const lines = fs.readFileSync(fileName, 'utf-8').split('\n').slice(1);

//     lines.forEach(line => {
//       const [dateStr, openStr, highStr, lowStr] = line.split(',', 4);
//       const date = Math.floor(parseInt(dateStr, 10) / 1000);
//       const open = parseFloat(openStr);
//       const high = parseFloat(highStr);
//       const low = parseFloat(lowStr);
//       history.addPricePoint(date, open, high, low);
//     });
//   }

//   public static parseChannel(id: string):  {
//     // console.log(`tg channel - ${id}`);

//     // const parser = this.getSignalParser(obj.id.toString());
//     // const tgChannelData = this.fetchTgChannelData()
//     // return this.signalsParser(obj.messages, parser);
//   }

// //   private static getSignalParser(channelId: string): SignalParser {
// //    fetch parse template from db logic here
// //   }

//   private static signalsParser(arr: any[], signalParser: SignalParser): Map<string, Map<number, Signal>> {
//     const signalsMap = new Map<string, Map<number, Signal>>();
//     MainTester.testSignalJSONFile(arr, signalParser);

//     arr.forEach(o => {
//       signalParser.setJSONObject(o);

//       const date = signalParser.getDate() + GlobalParameters.getOpenDateShift();
//       if (!this.isNeedToParseDataOn(date) || !signalParser.isNeedToParse()) return;

//       const pair = signalParser.getPair();
//       if (!this.isNeedToParsePair(pair)) return;

//       this.addSignalToMap(signalsMap, date, pair, signalParser.getEntriesList(), signalParser.getTakesList(), signalParser.getStop(), signalParser.getDirection());
//     });

//     if (signalsMap.size === 0) {
//       Logs.error(`Can't parse signals from - ${arr[0]}`, 'GLOBAL Signals PARSER');
//     }

//     return signalsMap;
//   }

//   private static addSignalToMap(signalsMap: Map<string, Map<number, Signal>>, date: number, pair: string, entriesList: number[], takesList: number[], stop: number, direction: Direction): void {
//     if (!Signal.isPointsOK(entriesList, takesList, stop, direction)) {
//       Logs.errorSignal(date, pair, direction, entriesList, takesList, stop, '-', 'SIGNAL');
//       return;
//     }

//     const truncatedDate = Math.floor(date / this.MINUTE) * this.MINUTE;
//     if (!signalsMap.has(pair)) {
//       signalsMap.set(pair, new Map<number, Signal>());
//     }

//     signalsMap.get(pair)!.set(truncatedDate, new Signal(entriesList, takesList, stop, truncatedDate, direction, pair));
//   }

//   private static isNeedToParseChannel(id: any): boolean {
//     return !GlobalParameters.getChannelID() || GlobalParameters.getChannelID() === id.toString();
//   }

//   private static isNeedToParseDataOn(date: number): boolean {
//     return this.isNeedToParsePriceHistoryOfRange(date, date);
//   }

//   private static isNeedToParsePriceHistoryOfRange(from: number, to: number): boolean {
//     return GlobalParameters.getDateFrom() <= to && GlobalParameters.getDateTo() >= from;
//   }

//   private static isNeedToParsePair(pair: string | null): boolean {
//     if (!pair || ['x', 'na', 'KSHIBUSDT'].includes(pair.toLowerCase())) return false;

//     if (GlobalParameters.getWhitelist().length > 0) {
//       return GlobalParameters.getWhitelist().includes(pair);
//     }

//     return !GlobalParameters.getBlacklist().includes(pair);
//   }

//   public static getListOfSignalsFileNameOfID(listOfAll: SignalsFileName[], channelID: string): SignalsFileName[] {
//     if (!channelID) return listOfAll;

//     return listOfAll.filter(signalsFileName => this.parseChannelID(signalsFileName) === channelID);
//   }

//   private static parseChannelID(signalsFileName: SignalsFileName): string {
//     const lines = fs.readFileSync(signalsFileName.getPathName(), 'utf-8').split('\n').slice(0, 6);

//     for (const line of lines) {
//       const startIdx = line.indexOf('"id": ');
//       if (startIdx !== -1) {
//         const endIdx = line.indexOf(',', startIdx + 6);
//         if (endIdx > startIdx) {
//           return line.substring(startIdx + 6, endIdx);
//         }
//       }
//     }

//     return '';
//   }
// }
