import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class CryptoCurrency {
  _id: string;

  @Prop({unique: true})
  symbol: string;

  @Prop()
  descirption?: string; 

  @Prop({default: true})
  isActive?: boolean

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const CryptoCurrencySchema =
  SchemaFactory.createForClass(CryptoCurrency);
