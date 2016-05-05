from django.test import TestCase
from django.contrib.auth.models import User
from models import Item, Bill, BillItem, Category
from dbmanager import commit_bill, undo_bill


class BillTestCase(TestCase):
    def setUp(self):
        self.output = {'errors': [],
                       'bill_id': None,
                       'customer_id': 'LOL',
                       'date': None,
                       'total': 0
                      }
        bibite = Category.objects.create(name='Bibite')
        panini = Category.objects.create(name='Panini')
        piatti = Category.objects.create(name='Piatti')
        Item.objects.create(name='Coca Cola', category=bibite, quantity=11,
                            price=3.50)
        Item.objects.create(name='Panino Salsiccia', category=panini,
                            quantity=0, price=6.50)
        pasta = Item.objects.create(name='Pasta al ragu', category=piatti,
                                    quantity=3, price=8.50)
        acqua = Item.objects.create(name='Acqua', category=bibite, quantity=5,
                                    price=1.00)
        self.lonfo = User.objects.create(username='Lonfo')
        self.billhd = Bill.objects.create(customer_id='1',
                                          customer_name='Darone',
                                          total=9.50, server='Simo')
        BillItem.objects.create(bill=self.billhd, item=pasta, category=piatti,
                                quantity=1, item_price=8.50, note='')
        BillItem.objects.create(bill=self.billhd, item=acqua, category=bibite,
                                quantity=1, item_price=1.00, note='')

    def tearDown(self):
        Item.objects.all().delete()
        Category.objects.all().delete()
        self.lonfo.delete()

    def test_commit_bill_success(self):
        reqdata = {'customer_name': 'Darozzo',
                   'items': {
                       'Coca Cola': {
                           'qty': 2,
                           'notes': '',
                       },
                       'Pasta al ragu': {
                           'qty': 3,
                           'notes': 'Scotta',
                       },
                       'Acqua': {
                            'qty': 1,
                            'notes': 'Fredda'
                           }
                   }
        }
        result, billhd = commit_bill(self.output, reqdata, self.lonfo)
        items = Item.objects.filter(name__in=reqdata['items'].keys())
        billitems = billhd.billitem_set.filter(item__in=items)

        for itm in billitems:
            self.assertEqual(itm.quantity,
                             reqdata['items'][itm.item.name]['qty'])
            self.assertEqual(itm.item_price, itm.item.price)

        self.assertEqual(len(billitems), 3)
        self.assertEqual(billhd.customer_name, 'Darozzo')
        self.assertEqual(billhd.server, 'Lonfo')
        self.assertEqual(result['errors'], {})
        self.assertEqual(result['customer_id'], 'LOL')
        self.assertEqual(result['total'], 33.5)

    def test_commit_bill_failure(self):
        reqdata = {'customer_name': 'Darozzo',
                   'items': {
                       'Coca Cola': {
                           'qty': 2,
                           'notes': '',
                       },
                       'Pasta al ragu': {
                           'qty': 4,
                           'notes': 'Scotta',
                       },
                       'Acqua': {
                            'qty': 6,
                            'notes': 'Fredda'
                           }
                   }
        }
        result, billhd = commit_bill(self.output, reqdata, self.lonfo)

        self.assertTrue(len(result['errors']) == 2)
        self.assertTrue(result['errors']['Acqua'] == 5)
        self.assertTrue(result['errors']['Pasta al ragu'] == 3)

    def test_undo_bill_success(self):
        msg = undo_bill(str(self.billhd.id), self.lonfo)
        deleted_bill = Bill.objects.get(pk=self.billhd.id)

        self.assertEqual(deleted_bill.deleted_by, 'Lonfo')
        self.assertEqual(msg, 'Bill #{} deleted!'.format(self.billhd.id))
        self.assertEqual(Item.objects.get(name='Acqua').quantity, 6)
        self.assertEqual(Item.objects.get(name='Pasta al ragu').quantity, 4)

    def test_undo_bill_failure(self):
        self.billhd.deleted_by = 'Lonfo'
        self.billhd.save()
        msg = undo_bill(str(self.billhd.id), self.lonfo)

        self.assertEqual(self.billhd.deleted_by, 'Lonfo')
        self.assertEqual(msg, 'Bill has already been deleted!')
        self.assertEqual(Item.objects.get(name='Acqua').quantity, 5)
        self.assertEqual(Item.objects.get(name='Pasta al ragu').quantity, 3)
