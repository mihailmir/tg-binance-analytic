import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type TgChannelDocument = HydratedDocument<TgChannel>;

@Schema({ timestamps: true })
export class TgChannel {
  _id: Types.ObjectId;

  @Prop()
  originalId: string;

  @Prop()
  name: string;

  @Prop({ required: false })
  searchKeyword?: string;


  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const TgChannelSchema = SchemaFactory.createForClass(TgChannel);
