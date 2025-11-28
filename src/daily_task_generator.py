"""Daily Task 템플릿 생성"""
import uuid
from datetime import datetime, timezone
from src.date_calculator import DateCalculator


class DailyTaskGenerator:
    """Daily Task Confluence 템플릿 생성 클래스"""

    # 요일 매핑
    WEEKDAY_NAMES = ["월", "화", "수", "목", "금", "토", "일"]

    def __init__(self):
        """DailyTaskGenerator 초기화"""
        self.date_calc = DateCalculator()

    def build_macro_json(self, target_date, weekday):
        """Page Properties 매크로 JSON 생성

        Args:
            target_date: 대상 날짜 (date 객체)
            weekday: 요일 문자열 (예: "월", "화")

        Returns:
            dict: Confluence Page Properties 매크로 JSON
        """
        # PRD 3.4: 동적 값 생성
        # id.value: DAILY_TASK_MK2_{YYYYMMDD}
        id_value = f"DAILY_TASK_MK2_{target_date.strftime('%Y%m%d')}"

        # timestamp: Unix timestamp (milliseconds) - UTC 00:00
        dt_utc = datetime(target_date.year, target_date.month, target_date.day, tzinfo=timezone.utc)
        timestamp = str(int(dt_utc.timestamp() * 1000))

        # localId: UUID v4 (2개 필요)
        local_id_1 = str(uuid.uuid4())
        local_id_2 = str(uuid.uuid4())

        # PRD 3.4: Page Properties 매크로 구조
        macro_json = {
            "type": "bodiedExtension",
            "attrs": {
                "layout": "default",
                "extensionType": "com.atlassian.confluence.macro.core",
                "extensionKey": "details",
                "parameters": {
                    "macroParams": {
                        "id": {
                            "value": id_value
                        }
                    },
                    "macroMetadata": {
                        "macroId": {
                            "value": "747feb18b0d676004bf942e2e1602b2e6344d970307fe38be07815a34ee0cafe"
                        },
                        "schemaVersion": {
                            "value": "1"
                        },
                        "title": "Page Properties"
                    }
                },
                "localId": local_id_1
            },
            "content": [
                {
                    "type": "paragraph",
                    "content": [
                        {
                            "type": "date",
                            "attrs": {
                                "timestamp": timestamp
                            }
                        },
                        {
                            "text": f" ({weekday})",
                            "type": "text"
                        }
                    ]
                },
                {
                    "type": "table",
                    "attrs": {
                        "layout": "default",
                        "localId": local_id_2
                    },
                    "content": [
                        {
                            "type": "tableRow",
                            "content": [
                                {
                                    "type": "tableHeader",
                                    "attrs": {
                                        "colspan": 1,
                                        "rowspan": 1,
                                        "colwidth": [323]
                                    },
                                    "content": [
                                        {
                                            "type": "paragraph",
                                            "marks": [
                                                {
                                                    "type": "alignment",
                                                    "attrs": {
                                                        "align": "center"
                                                    }
                                                }
                                            ],
                                            "content": [
                                                {
                                                    "text": "업무",
                                                    "type": "text",
                                                    "marks": [
                                                        {
                                                            "type": "strong"
                                                        }
                                                    ]
                                                }
                                            ]
                                        }
                                    ]
                                },
                                {
                                    "type": "tableHeader",
                                    "attrs": {
                                        "colspan": 1,
                                        "rowspan": 1,
                                        "colwidth": [323]
                                    },
                                    "content": [
                                        {
                                            "type": "paragraph",
                                            "marks": [
                                                {
                                                    "type": "alignment",
                                                    "attrs": {
                                                        "align": "center"
                                                    }
                                                }
                                            ],
                                            "content": [
                                                {
                                                    "text": "코멘트",
                                                    "type": "text",
                                                    "marks": [
                                                        {
                                                            "type": "strong"
                                                        }
                                                    ]
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            "type": "tableRow",
                            "content": [
                                {
                                    "type": "tableCell",
                                    "attrs": {
                                        "colspan": 1,
                                        "rowspan": 1,
                                        "colwidth": [323]
                                    },
                                    "content": [
                                        {
                                            "type": "paragraph"
                                        }
                                    ]
                                },
                                {
                                    "type": "tableCell",
                                    "attrs": {
                                        "colspan": 1,
                                        "rowspan": 1,
                                        "colwidth": [323]
                                    },
                                    "content": [
                                        {
                                            "type": "paragraph"
                                        },
                                        {
                                            "type": "paragraph"
                                        },
                                        {
                                            "type": "paragraph"
                                        },
                                        {
                                            "type": "paragraph"
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        }

        return macro_json

    def generate_templates_for_month(self, year, month, holidays):
        """특정 월의 모든 영업일에 대해 템플릿 생성

        Args:
            year: 연도
            month: 월
            holidays: 공휴일 리스트

        Returns:
            list: Page Properties 매크로 JSON 리스트
        """
        # PRD 3.2-3: 다음 달 영업일 목록 계산
        business_days = self.date_calc.get_business_days(year, month, holidays)

        templates = []

        for business_day in business_days:
            weekday = self.WEEKDAY_NAMES[business_day.weekday()]
            template = self.build_macro_json(business_day, weekday)
            templates.append(template)

        return templates
