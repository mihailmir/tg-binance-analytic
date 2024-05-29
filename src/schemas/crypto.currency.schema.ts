import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';


@Schema({ timestamps: true })
export class CryptoCurrency {
  _id: Types.ObjectId;

  @Prop({ unique: true })
  symbol: string;

  @Prop()
  description?: string;

  @Prop({ default: true })
  isActive?: boolean;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const CryptoCurrencySchema =
  SchemaFactory.createForClass(CryptoCurrency);
