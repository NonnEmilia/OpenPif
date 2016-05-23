from django.forms.widgets import DateInput, TimeInput, SplitDateTimeWidget


class DateHTML5Input(DateInput):
    input_type = 'date'


class TimeHTML5Input(TimeInput):
    input_type = 'time'


class SplitDateTimeHTML5Widget(SplitDateTimeWidget):
    def __init__(self, attrs=None, date_format=None, time_format=None):
        widgets = (DateHTML5Input(attrs=attrs, format=date_format),
                   TimeHTML5Input(attrs=attrs, format=time_format))
        super(SplitDateTimeWidget, self).__init__(widgets, attrs)
