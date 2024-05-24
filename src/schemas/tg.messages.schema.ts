import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TgSignalDocument = HydratedDocument<TgSignal>;

@Schema({ timestamps: true })
export class TgSignal {

  @Prop()
  tgChannelId: string;

  @Prop()
  message: string;

  @Prop()
  createdAt?: Date

  @Prop()
  updatedAt?: Date
}

export const TgSignalSchema = SchemaFactory.createForClass(TgSignal);