import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

export enum TradeStatus {
  OPEN = 'open',
  LIMIT = 'limit',
  TAKE = 'take',
  STOP = 'stop',
  REVERSE = 'reverse',
  STOP_BEFORE_ENTRY = 'stop_before_entry',
  BREAKEVEN = 'breakeven',
}

export class AchievedTake {
  @Prop({
    required: false,
    type: Types.ObjectId,
    default: new Types.ObjectId(),
  })
  _id?: Types.ObjectId;

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

export class AchievedEntry {
  @Prop({
    required: false,
    type: Types.ObjectId,
    default: new Types.ObjectId(),
  })
  _id?: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId })
  candleId: Types.ObjectId;

  @Prop({ required: true })
  entry: number;

  @Prop({ required: true })
  time: number;
}

export class AchievedStop {
  @Prop({ required: true, type: Types.ObjectId, default: new Types.ObjectId() })
  _id: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId })
  candleId: Types.ObjectId;

  @Prop({ required: true })
  stop: number;

  @Prop({ required: true })
  adjustedStop: number;

  @Prop({ required: true })
  time: number;
}

@Schema({ timestamps: true })
export class Trade {
  _id: Types.ObjectId;

  @Prop({ required: true })
  currencyId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId })
  tgChannelId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId })
  signalId: Types.ObjectId;

  @Prop({ default: [] })
  achievedTakes: AchievedTake[];

  @Prop({ default: 0 })
  totalProfitPercentage: number;

  @Prop({
    type: String,
    enum: Object.values(TradeStatus),
    default: TradeStatus.LIMIT,
  })
  status: TradeStatus;

  @Prop({ default: null })
  achievedStop: AchievedStop;

  @Prop({ default: [] })
  achievedEntry: AchievedEntry[];

  @Prop({ default: 0 })
  movement: number;

  @Prop({ default: 0 })
  riskReward: number;

  @Prop({ default: 0 })
  startPrice: number;

  @Prop({ default: 0 })
  reversePrice: number;

  @Prop()
  closeDate?: number;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const TradeSchema = SchemaFactory.createForClass(Trade);
TradeSchema.index({ signalId: 1 });
TradeSchema.index({ tgChannelId: 1 });
