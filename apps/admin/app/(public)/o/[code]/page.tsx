import { OrderClient } from "./OrderClient";

export default function OrderPage({ params }: { params: { code: string } }) {
  return <OrderClient code={params.code} />;
}
