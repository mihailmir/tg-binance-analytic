import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TgSignalDocument = TgSignal & Document;

export enum SignalType {
  LONG = 'long',
  SHORT = 'short',
}

@Schema({ timestamps: true })
export class TgSignal {
  _id: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId})
  tgChannelId: Types.ObjectId;

  @Prop()
  message: string;

  @Prop()
  pair: string;

  @Prop({ default: [] })
  entryTargets: number[];

  @Prop({ default: [] })
  profitTargets: number[];

  @Prop()
  stop: number;

  @Prop({ type: String, enum: Object.values(SignalType) })
  type: SignalType;

  @Prop()
  postTimestamp?: number

  @Prop()
  createdAt?: Date

  @Prop()
  updatedAt?: Date
}

export const TgSignalSchema = SchemaFactory.createForClass(TgSignal);