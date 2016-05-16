from django.db import models
from django.contrib.auth.models import User


# Location class, used to determine from wich actual pos location the cashier
# is working (ex. Bar, restaurant, ...)

class Location(models.Model):
    id = models.AutoField(primary_key=True)
    description = models.CharField(max_length=30)
    enabled = models.BooleanField(default=True)

    def __unicode__(self):
        return self.description

# Category class, used as a container for different type of items, related by
# area (ex. Kitchen, beverages, ...)

class Category(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=30, unique=True)
   # location = models.ForeignKey('Location')
    priority = models.PositiveSmallIntegerField(default=10)
    enabled = models.BooleanField(default=True)
    printable = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = 'Categories'

    def __unicode__(self):
        return self.name

# Item class, basically the items that we'll sell (ex. Coke, Pizza, Costata,
# ...)

class Item(models.Model):
    id = models.AutoField(primary_key=True)  # check if ID is useful
    name = models.CharField(max_length=30, unique=True)
    category = models.ForeignKey('Category', null=True,
                                 on_delete=models.SET_NULL)
    quantity = models.PositiveSmallIntegerField(null=True, blank=True)
    priority = models.PositiveSmallIntegerField(default=10)
    enabled = models.BooleanField(default=True)
    price = models.DecimalField(max_digits=6, decimal_places=2)

    def is_available(self):
        return self.quantity is not 0
    is_available.admin_order_field = 'quantity'
    is_available.boolean = True
    is_available.short_description = 'Available?'

    def __unicode__(self):
        return self.name

# Bill class, it stores a whole order made by one client

class Bill(models.Model):
    id = models.AutoField(primary_key=True)
    customer_id = models.CharField(max_length=20, null=True, blank=True)
    customer_name = models.CharField(max_length=40)
    date = models.DateTimeField(auto_now_add=True)
    total = models.DecimalField(max_digits=12, decimal_places=2)
    server = models.CharField(max_length=40)
    deleted_by = models.CharField(max_length=40, blank=True)

    def is_committed(self):
        if self.deleted_by == '':
            return True
        else:
            return False
    is_committed.boolean = True
    is_committed.short_description = 'Validated'

    def __unicode__(self):
        return self.customer_name + ' ' + '#' + str(self.id)


# class to store the single entries that when grouped together will form one,
# and just one bill

class BillItem(models.Model):
    id = models.AutoField(primary_key=True)
    bill = models.ForeignKey('Bill', on_delete=models.CASCADE)
    item = models.ForeignKey('Item', on_delete=models.DO_NOTHING)
    category = models.ForeignKey('Category', null=True,
                                 on_delete=models.SET_NULL)
    quantity = models.PositiveSmallIntegerField()
    item_price = models.DecimalField(max_digits=12, decimal_places=2)
    note = models.CharField(max_length=200, blank=True)

    @property
    def total_cost(self):
        return self.quantity * self.item_price


class BillItemExtra(models.Model):
    id = models.AutoField(primary_key=True)
    billitem = models.ForeignKey('BillItem', on_delete=models.CASCADE)
    item = models.ForeignKey('Item', on_delete=models.DO_NOTHING)
    quantity = models.PositiveSmallIntegerField()
    item_price = models.DecimalField(max_digits=12, decimal_places=2)

    @property
    def total_cost(self):
        return self.quantity * self.item_price
