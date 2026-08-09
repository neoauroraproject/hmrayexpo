import React from "react";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
import { StatusBadge } from "../components/ui/StatusBadge";

export default function DesignSystemPreview() {
  return (
    <div className="container mx-auto p-8 space-y-12">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-foreground">سیستم دیزاین HMRAY</h1>
        <p className="text-muted-foreground text-lg">پیش‌نمایش توکن‌ها و کامپوننت‌های پنل مدیریت (SaaS Professional)</p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold border-b pb-2">رنگ‌ها و وضعیت‌ها (Status Badges)</h2>
        <div className="flex flex-wrap gap-4">
          <StatusBadge status="draft" />
          <StatusBadge status="pending" />
          <StatusBadge status="payment" />
          <StatusBadge status="success" />
          <StatusBadge status="shipped" />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold border-b pb-2">دکمه‌ها (Buttons)</h2>
        <div className="flex flex-wrap items-center gap-4">
          <Button>ثبت و ادامه</Button>
          <Button variant="secondary">انصراف</Button>
          <Button variant="outline">ذخیره پیش‌نویس</Button>
          <Button variant="ghost">بدون پس‌زمینه</Button>
          <Button variant="destructive">حذف درخواست</Button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold border-b pb-2">بج‌ها (Badges)</h2>
        <div className="flex flex-wrap items-center gap-4">
          <Badge>جدید</Badge>
          <Badge variant="secondary">ثانویه</Badge>
          <Badge variant="outline">حاشیه دار</Badge>
          <Badge variant="destructive">مهم</Badge>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold border-b pb-2">کارت و فرم (Cards & Forms)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>جزئیات درخواست جدید</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">عنوان درخواست</label>
                <Input placeholder="مثال: خرید لوازم جانبی" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">توضیحات تکمیلی</label>
                <Textarea placeholder="جزئیات بیشتر را اینجا وارد کنید..." />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button variant="outline">انصراف</Button>
              <Button>ذخیره درخواست</Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>خلاصه وضعیت سفارش</CardTitle>
                <StatusBadge status="pending" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">شماره سفارش</span>
                <span className="font-semibold">ORD-9821</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">مشتری</span>
                <span className="font-semibold">علی احمدی</span>
              </div>
              <div className="flex justify-between pb-2">
                <span className="text-muted-foreground">مبلغ کل</span>
                <span className="font-semibold">۱,۲۰۰,۰۰۰ تومان</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
