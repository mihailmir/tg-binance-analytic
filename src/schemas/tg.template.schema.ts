import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ParsTemplateDocument = HydratedDocument<ParsTemplate>;


export enum TemplateType {
  ENTRY = 'entry',
  TAKE_PROFIT = 'take-profit',
  STOP_LOSS = 'stop-loss',
}

@Schema({ timestamps: true })
export class ParsTemplate {
  _id: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId })
  tgChannelId: Types.ObjectId;

  @Prop()
  template: string;


  @Prop({ type: String, enum: Object.values(TemplateType) })
  type: TemplateType;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const ParsTemplateSchema = SchemaFactory.createForClass(ParsTemplate);
