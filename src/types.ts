export interface Product {
  _id: string;
  name: string;
  price: number;
  stock: number;
  image?: string;
  category?: string;
  description?: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  _id: string;
  customerName: string;
  items: OrderItem[];
  totalPrice: number;
  paymentStatus: 'Paid' | 'Unpaid';
  paymentMethod: 'Tunai' | 'QRIS' | 'TF';
  amountPaid: number;
  orderStatus: 'Pending' | 'Shipped' | 'Delivered' | 'Cancelled';
  createdAt: string;
}
