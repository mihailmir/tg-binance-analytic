import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ParsTemplateDocument = HydratedDocument<ParsTemplate>;

@Schema({ timestamps: true })
export class ParsTemplate {

  @Prop()
  tgChannelId: string;

  @Prop()
  template: string;

  @Prop()
  createdAt?: Date

  @Prop()
  updatedAt?: Date
}

export const ParsTemplateSchema = SchemaFactory.createForClass(ParsTemplate);