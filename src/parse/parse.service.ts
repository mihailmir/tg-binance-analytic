import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { Types, Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { TgSignal } from '../schemas/tg.messages.schema';
import { ParsTemplate } from 'src/schemas/tg.template.schema';
import { CreateTemplateDto } from 'src/dto/createTemplate.dto';

const takeProfits: Record<string, number> = {};

function parseSignal(signal) {
  const targetCurrencyKeys = ['BTC', 'ETH', 'USDT', 'USD'];
  const targetEntryKeys = [
    'entry',
    'entries',
    'buy',
    'Entry Zone',
    'Entry Targets',
    'Buy Zone',
  ];
  const takeProfitKeys = [
    'Take-Profit Targets',
    'Targets'
  ];
  const directionKeys = ['SHORT', 'LONG'];

  const signalTypeKeys = [
    'Signal',
    'Signal type'
  ];
  const stopLoseKeys = ['stop', 'sl ', 'sl:', 'Stoploss'];
  // const leverageKeys = ['Leverage', 'lev'];

  const signalObj = {pair: null, signalType: null, entryTargets: null, leverage: null, profitTargets: null, stopTargets: null};
  const createRegexFromArray = (array: string[]) => array.map(keyword => keyword.replace(/[\s:]/g, '\\s*')).join('|');

  
  // Регулярные выражения для поиска нужных данных
  const pairMatch = signal.match( `(?:\\b|#)([A-Z]+)\\s*\\/?\\s*(${createRegexFromArray(targetCurrencyKeys)})\\b`, 'i');
  const signalTypeMatch = signal.match(new RegExp(`(${createRegexFromArray(directionKeys)})`, 'i'));
  // const leverageMatch = signal.match(new RegExp(`(?:${createRegexFromArray(leverageKeys)})(?:\\s*[:\\-\\s])\\s*([\\d\\w\\.xX_\\(\\)]+)`, 'i'));
  const entryTargetsMatch = signal.match(new RegExp(`(?:${createRegexFromArray(targetEntryKeys)}):\\s*([\\s\\S]*?)(?=\\r\\n\\r\\n|$)`, 'i'));
  const entryZoneMatch = signal.match(/Entry zone :\s*([\d\.-]+)/);
  const profitTargetsMatch = signal.match(/Take-Profit Targets:\s*([\s\S]*?)(?=\r\n\r\n|$)/);
  const targetsMatch = signal.match(/Targets :\s*([\d\.-]+)/);
  const stopTargetsMatch = signal.match(/Stop Targets:\s*([\s\S]*?)(?=\r\n\r\n|$)/);
  const stopLossMatch = signal.match(/Stop loss :\s*(\d+\.\d+)/i);

  // Заполнение объекта на основе найденных данных
  if (pairMatch) signalObj.pair = pairMatch[1];
  if (signalTypeMatch) signalObj.signalType = signalTypeMatch[1];
  // if (leverageMatch) signalObj.leverage = leverageMatch[1];
  
  if (entryTargetsMatch) {
      signalObj.entryTargets = entryTargetsMatch[1].match(/\d+\.\d+/g).map(Number);
  } else if (entryZoneMatch) {
      signalObj.entryTargets = entryZoneMatch[1].split('-').map(Number);
  }

  if (profitTargetsMatch) {
      signalObj.profitTargets = profitTargetsMatch[1].match(/\d+\.\d+/g).map(Number);
  } else if (targetsMatch) {
      signalObj.profitTargets = targetsMatch[1].split('-').map(Number);
  }

  if (stopTargetsMatch) {
      signalObj.stopTargets = stopTargetsMatch[1].match(/\d+\.\d+/g).map(Number);
  } else if (stopLossMatch) {
      signalObj.stopTargets = [parseFloat(stopLossMatch[1])];
  }
  console.log(signalObj)
  return signalObj;
}

@Injectable()
export class ParseService {
  private readonly logger = new Logger(ParseService.name);
  private readonly targetCurrencyKeys = ['BTC', 'ETH', 'USDT', 'USD'];
  private readonly targetEntryKeys = [
    'entry',
    'entries',
    'buy',
    'Entry Zone',
    'Entry Targets',
    'Buy Zone',
  ];
  private readonly takeProfitKeys = [
    'Take-Profit Targets:',
    'take-profit',
    'target',
    'take',
    'tp:',
    'Targets',
  ];
  private readonly stopLoseKeys = ['stop', 'sl ', 'sl:', 'Stoploss'];

  constructor(
    @InjectModel(TgSignal.name)
    private tgSignal: Model<TgSignal>,
    @InjectModel(TgSignal.name)
    private parsTemplate: Model<ParsTemplate>,
  ) {}

  parseSignal = async () => {};

  // isNeedToParse = (message: string): boolean =>  {
  //     if (message.includes('imeframe:')) {
  //       return true;
  //     }
  //   return false;
  // }
  parseMessages = (messages) => {
    // messages.forEach(m => {
    //   const msgText = m.message;
    //   m['pair'] = this.getPair(msgText);
    //   m['take'] =

    // });

    // const messages = this.tgSignal.find()
    return [];
  };

  getPair = (message: string): string | null => {
    const keywordPattern = this.targetCurrencyKeys.join('|');
    const regex = new RegExp(
      `(?:\\b|#)([A-Z]+)\\s*\\/?\\s*(${keywordPattern})\\b`,
      'i',
    ); // The constructed regex
    const match = message.match(regex);

    if (match) {
      this.logger.log(
        `Matched Pair: ${match[0]}, Value: ${match[1]}, Currency: ${match[2]}`,
      );
      return `${match[1].toUpperCase()}${match[2].toUpperCase()}`;
    }

    return null;
  };

  getEntry = (message: string): string | null => {
    const keywordPattern = this.targetEntryKeys
      .map((keyword) => keyword.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'))
      .join('|');
    const regex = new RegExp(
      `(?:${keywordPattern})[^\\d]*((?:(?:\\d+\\.?\\d*)[)\\s]*\\n?)+)`,
      'ig',
    );
    const match = message.match(regex);

    if (match) {
      this.logger.log(
        `Matched Entry Zone: ${match[0]}, Low: ${match[1]}, High: ${match[2]}`,
      );
      return `${match[1].toUpperCase()}${match[2]}`;
    }

    return null;
  };

  getStopLoss = (message: string): string | null => {
    const keywordPattern = this.stopLoseKeys.join('|');
    const regex = new RegExp(
      `(?:\\b|#|\\s)(${keywordPattern})(?:\\s+|\\s*[:\\-])\\s*(\\d+(?:\\.\\d+)?)`,
      'i',
    );

    const match = message.match(regex);

    if (match) {
      this.logger.log(
        `Matched Stop Loss: ${match[0]}, key: ${match[1]}, value: ${match[2]}`,
      );
      return match[2];
    }

    return null;
  };

  getTakes = async (message: string) => {
    parseSignal(message)
    // const takeProfitPattern = this.takeProfitKeys
    //   .map((phrase) => phrase.replace(/[-\s]/g, '[-\\s]?'))
    //   .join('|');
    // const regex = new RegExp(
    //   `(?:${takeProfitPattern})[\\s\\S]*?((?:0\\.\\d{5}[\\s\\S]*?)+)(?=\\n\\s*⛔️|$)`,
    //   'gi',
    // );
    // const match = regex.exec(message);

    // if (!match) return [];

    // const takeProfitsSection = match[1];
    // const takeProfitsRegex = /0\.\d{5}/g;
    // const takeProfits = [];
    // let subMatch;

    // while ((subMatch = takeProfitsRegex.exec(takeProfitsSection)) !== null) {
    //   takeProfits.push(subMatch[0]);
    // }
    // console.log(takeProfits);
    // Example message
  };

  async createParsTemplate(
    createParsTemplateDto: CreateTemplateDto,
  ): Promise<ParsTemplate> {
    const createdParsTeamplate = await this.parsTemplate.create(
      createParsTemplateDto,
    );
    return createdParsTeamplate.save();
  }
}
