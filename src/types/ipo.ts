export interface IpoSchedule {
  id: number;
  external_id: number;
  stock_name: string;
  subscription_date: string | null;
  offering_price: string | null;
  offering_price_range: string | null;
  lead_underwriter: string | null;
  stock_code: string | null;
  category: string | null;
  total_shares: string | null;
  confirmed_price: string | null;
  institutional_competition_rate: string | null;
  lock_up_rate: string | null;
  subscription_competition_rate: string | null;
  ir_date: string | null;
  listing_date: string | null;
  refund_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface MyIpoEntry {
  id: string;
  stockName: string;
  ipoPrice: number;
  allocatedQuantity: number;
  sellPrice: number | null;
  sellDate: string | null;
  fee: number;
  profit: number;
}
