package gdrj

import (
	"github.com/eaciit/dbox"
	"github.com/eaciit/orm/v1"
)

type MasterReportSubChannel struct {
	orm.ModelBase `json:"-" bson:"-"`
	ID            string `json:"_id" bson:"_id"` //BrandID
	Name          string
	ChannelID     string
}

func (c *MasterReportSubChannel) RecordID() interface{} {
	return c.ID
}

func (c *MasterReportSubChannel) TableName() string {
	return "masterreportsubchannel"
}

func MasterReportSubChannelGetByChannelID(channelid string) ([]*MasterReportSubChannel, error) {
	cursor, err := Find(new(MasterReportSubChannel), dbox.Eq("channelid", channelid), nil)
	if err != nil {
		return nil, err
	}

	result := []*MasterReportSubChannel{}
	err = cursor.Fetch(&result, 0, false)
	if err != nil {
		return nil, err
	}
	cursor.Close()

	return result, nil
}
