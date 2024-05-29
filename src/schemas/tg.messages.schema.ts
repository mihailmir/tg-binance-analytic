import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type TgSignalDocument = HydratedDocument<TgSignal>;

@Schema({ timestamps: true })
export class TgSignal {
  _id: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId})
  tgChannelId: Types.ObjectId;

  @Prop()
  message: string;

  @Prop()
  postTimestamp?: number

  @Prop()
  createdAt?: Date

  @Prop()
  updatedAt?: Date
}

export const TgSignalSchema = SchemaFactory.createForClass(TgSignal);