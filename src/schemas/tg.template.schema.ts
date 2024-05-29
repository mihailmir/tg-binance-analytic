import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ParsTemplateDocument = HydratedDocument<ParsTemplate>;

@Schema({ timestamps: true })
export class ParsTemplate {
  _id: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId })
  tgChannelId: Types.ObjectId;

  @Prop()
  template: string;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const ParsTemplateSchema = SchemaFactory.createForClass(ParsTemplate);
