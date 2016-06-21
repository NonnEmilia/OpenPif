from django.test import TestCase
from django.contrib.auth.models import User
from models import Item, Bill, BillItem, BillItemExtra, Category
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
        pizze = Category.objects.create(name='Pizze')
        aggiunte = Category.objects.create(name='Aggiunte')
        Item.objects.create(name='Coca Cola', category=bibite, quantity=11,
                            price=3.50)
        Item.objects.create(name='Panino Salsiccia', category=panini,
                            quantity=0, price=6.50)
        pizza = Item.objects.create(name='Pizza Margherita', category=panini,
                                    quantity=5, price=5.00)
        peperoni = Item.objects.create(name='Peperoni', category=aggiunte,
                                       quantity=10, price=0.50)
        acciughe = Item.objects.create(name='Acciughe', category=aggiunte,
                                       quantity=10, price=1.50)
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
        pizza_i = BillItem.objects.create(bill=self.billhd, item=pizza,
                                          category=pizze, quantity=1,
                                          item_price=5.00, note='')
        BillItemExtra.objects.create(billitem=pizza_i, item=peperoni,
                                     quantity=1, item_price=0.50)

    def tearDown(self):
        Item.objects.all().delete()
        Category.objects.all().delete()
        self.lonfo.delete()

    def test_commit_bill_success(self):
        reqdata = {'customer_name': 'Darozzo',
                   'items': [
                       {'name': 'Coca Cola',
                        'qty': 2,
                        'notes': '',
                        'extras': {},
                       },
                       {'name': 'Pasta al ragu',
                        'qty': 3,
                        'notes': 'Scotta',
                        'extras': {},
                       },
                       {'name': 'Acqua',
                        'qty': 1,
                        'notes': 'Fredda',
                        'extras': {},
                       },
                       {'name': 'Pizza Margherita',
                        'qty': 1,
                        'notes': 'Fredda',
                        'extras': {
                            'Peperoni': {
                                'qty': 1,
                            }
                         },
                       },
                       {'name': 'Pizza Margherita',
                        'qty': 1,
                        'notes': 'Fredda',
                        'extras': {
                            'Acciughe': {
                                'qty': 1,
                            }
                         },
                       }
                    ]
                   }
        result, billhd = commit_bill(self.output, reqdata, self.lonfo)
        billitems = billhd.billitem_set.filter(item__name__in=[item['name'] for item in reqdata['items']])
        billitems_all = billhd.billitem_set.all()
        self.assertEqual(len(billitems), len(billitems_all))
        for bitm1, bitm2 in zip(billitems, billitems_all):
            self.assertEqual(bitm1.item.name, bitm2.item.name)
            for extra1, extra2 in zip(bitm1.billitemextra_set.all(),
                                      bitm2.billitemextra_set.all()):
                self.assertEqual(extra1.item.name, extra2.item.name)

        self.assertEqual(len(billitems_all), 5)
        self.assertEqual(len(billitems), 5)
        self.assertEqual(Item.objects.get(name='Pizza Margherita').quantity, 3)
        self.assertEqual(Item.objects.get(name='Acciughe').quantity, 9)
        self.assertEqual(Item.objects.get(name='Peperoni').quantity, 9)
        self.assertEqual(Item.objects.get(name='Coca Cola').quantity, 9)
        self.assertEqual(Item.objects.get(name='Pasta al ragu').quantity, 0)
        self.assertEqual(Item.objects.get(name='Acqua').quantity, 4)
        self.assertEqual(billhd.customer_name, 'Darozzo')
        self.assertEqual(billhd.server, 'Lonfo')
        self.assertEqual(result['errors'], {})
        self.assertEqual(result['customer_id'], 'LOL')
        self.assertEqual(result['total'], 45.5)

    def test_commit_bill_failure(self):
        reqdata = {'customer_name': 'Darozzo',
                   'items': [
                       {'name': 'Coca Cola',
                        'qty': 2,
                        'notes': '',
                        'extras': {},
                       },
                       {'name': 'Pasta al ragu',
                        'qty': 4,
                        'notes': 'Scotta',
                        'extras': {},
                       },
                       {'name': 'Acqua',
                        'qty': 6,
                        'notes': 'Fredda',
                        'extras': {},
                       },
                       {'name': 'Pizza Margherita',
                        'qty': 6,
                        'notes': 'Fredda',
                        'extras': {
                            'Peperoni': {
                                'qty': 11,
                            }
                        },

                       },
                   ]
                  }
        result, billhd = commit_bill(self.output, reqdata, self.lonfo)
        self.assertTrue(len(result['errors']) == 4)
        self.assertTrue(result['errors']['Acqua'] == 5)
        self.assertTrue(result['errors']['Pasta al ragu'] == 3)
        self.assertTrue(result['errors']['Pizza Margherita'] == 5)
        self.assertTrue(result['errors']['Peperoni'] == 10)

    def test_undo_bill_success(self):
        msg = undo_bill(str(self.billhd.id), self.lonfo)
        deleted_bill = Bill.objects.get(pk=self.billhd.id)

        self.assertEqual(deleted_bill.deleted_by, 'Lonfo')
        self.assertEqual(msg, 'Bill #{} deleted!'.format(self.billhd.id))
        self.assertEqual(Item.objects.get(name='Acqua').quantity, 6)
        self.assertEqual(Item.objects.get(name='Pasta al ragu').quantity, 4)
        self.assertEqual(Item.objects.get(name='Pizza Margherita').quantity, 6)
        self.assertEqual(Item.objects.get(name='Peperoni').quantity, 11)

    def test_undo_bill_failure(self):
        self.billhd.deleted_by = 'Lonfo'
        self.billhd.save()
        msg = undo_bill(str(self.billhd.id), self.lonfo)

        self.assertEqual(self.billhd.deleted_by, 'Lonfo')
        self.assertEqual(msg, 'Bill has already been deleted!')
        self.assertEqual(Item.objects.get(name='Acqua').quantity, 5)
        self.assertEqual(Item.objects.get(name='Pasta al ragu').quantity, 3)
        self.assertEqual(Item.objects.get(name='Pizza Margherita').quantity, 5)
        self.assertEqual(Item.objects.get(name='Peperoni').quantity, 10)

