from django.contrib.auth.models import User
from models import Item, Bill, BillItem, BillItemExtra


def undo_bill(billid, user):
    bill = Bill.objects.get(pk=billid)
    if not bill.is_committed():
        return 'Bill has already been deleted!'
    for billitem in bill.billitem_set.all():
        if billitem.item.quantity is not None:
            billitem.item.quantity += billitem.quantity
            billitem.item.save()
        for extra in billitem.billitemextra_set.all():
            if extra.item.quantity is not None:
                extra.item.quantity += extra.quantity
                extra.item.save()
    bill.deleted_by = user.username
    bill.save()
    return 'Bill #' + billid + ' deleted!'


def commit_bill(output, reqdata, user):
    errors = []
    to_commit_billitems = []
    to_commit_extras = []
    items = _get_items(reqdata)
    bill = Bill(customer_name=reqdata['customer_name'],
                server=User.objects.get(pk=user.id).username,
                customer_id=output['customer_id'], total=0)
    for r_billitem in reqdata['items']:
        r_data = reqdata['items'][r_billitem]
        item = items[r_billitem]
        billitem, ok = _create_item(r_data, BillItem, item)
        if ok:
            bill.total += billitem.item_price * billitem.quantity
            billitem.bill = bill
            billitem.category = billitem.item.category
            billitem.note = r_data['notes']
            to_commit_billitems.append(billitem)
        else:
            errors.append((billitem.item.name, billitem.item.quantity))
        for r_extra in r_data['extras']:
            r_data = reqdata['items'][r_billitem]['extras'][r_extra]
            item = items[r_extra]
            extra, ok = _create_item(r_data, BillItemExtra, item)
            if ok:
                bill.total += extra.item_price * extra.quantity
                extra.billitem = billitem
                to_commit_extras.append(extra)
            else:
                errors.append((extra.item.name, extra.item.quantity))
    if errors:
        output['total'] = 0
        output['customer_id'] = None
        output['errors'] = dict(errors)
        bill = None
    else:
        bill = _commit_bill_to_db(bill, to_commit_billitems, to_commit_extras,
                                  items)
        output['total'] = bill.total
        output['customer_id'] = bill.customer_id
        output['errors'] = {}
        output['date'] = bill.date
        output['billid'] = bill.id
    return output, bill


def _get_items(reqdata):
    items = {}
    for r_billitem in reqdata['items']:
        items[r_billitem] = None
        for r_extra in reqdata['items'][r_billitem]['extras']:
            items[r_extra] = None
    db_items = Item.objects.select_for_update().filter(name__in=items.keys())
    for db_item in db_items:
        items[db_item.name] = db_item
    return items


def _create_item(r_data, BillElementClass, item):
    ok = True
    element = BillElementClass(item=item, item_price=item.price)
    if item.quantity is not None:
        remaining_quantity = item.quantity - r_data['qty']
        if remaining_quantity >= 0:
            item.quantity = remaining_quantity
        else:
            ok = False
    element.quantity = r_data['qty']
    return element, ok


def _commit_bill_to_db(bill, to_commit_billitems, to_commit_extras, items):
    for item in items.values():
        item.save()
    if bill.total < 0:
        bill.total = 0
    bill.save()
    for item in to_commit_billitems:
        item.bill = item.bill
        item.save()
    for item in to_commit_extras:
        item.billitem = item.billitem
        if item.billitem:
            item.save()
    return bill
