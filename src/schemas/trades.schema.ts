import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types, Model } from 'mongoose';
import { BinanceMarketData } from './binance.data.schema';

export enum TradeStatus {
  OPEN = 'open',
  LIMIT = 'limit',
  TAKE = 'take',
  STOP = 'stop',
  // REVERSE = 'REVERSE', ???
  // LOGIC_ERROR = 'logic_error',
  // SIGNAL_ERROR = 'signal_error',
  STOP_BEFORE_ENTRY = 'stop_before_entry',
  BREAKEVEN = 'breakeven',
}

export class AchievedTake {
  @Prop({ required: true, type: Types.ObjectId, default: new Types.ObjectId() })
  _id: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId })
  candleId: Types.ObjectId;

  @Prop({ required: true })
  take: number;

  @Prop({ required: true })
  profitPercentage: number;

  @Prop({ required: true })
  time: number;

  @Prop({ required: true })
  percentageClosed: number;
}

@Schema({ timestamps: true })
export class Trade {
  _id: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId })
  tgChannelId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId })
  signalId: Types.ObjectId;

  @Prop({ default: [] })
  achievedTakes: AchievedTake[];

  @Prop({ default: 0 })
  totalProfitPercentage: number;

  @Prop({ type: String, enum: Object.values(TradeStatus), default: TradeStatus.LIMIT })
  status: TradeStatus;

  @Prop({ default: 0 })
  adjustedStop: number;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const TradeSchema = SchemaFactory.createForClass(Trade);
