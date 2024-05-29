import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ timestamps: true })
export class BinanceMarketData {
  @Prop({ required: true, type: Types.ObjectId})
  currencyId: Types.ObjectId;

  @Prop({ required: true })
  open: number;

  @Prop({ required: true })
  high: number;

  @Prop({ required: true })
  low: number;

  @Prop({ required: true })
  close: number;

  @Prop({ required: true })
  volume: number;

  @Prop({ required: true })
  closeTime: number;

  @Prop({ required: true })
  quoteVolume: number;

  @Prop({ required: true })
  trades: number;

  @Prop({ required: true })
  baseAssetVolume: number;

  @Prop({ required: true })
  quoteAssetVolume: number;

  // @Prop({ required: true })
  // ignore: number;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const BinanceMarketDataSchema =
  SchemaFactory.createForClass(BinanceMarketData);
