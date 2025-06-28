package contextHelpers

import (
	"bystrze/apps/common/models"
	"context"
)

type userInfoKeyType string

const userInfoKey userInfoKeyType = "UserInfo"

func WithUserInfo(ctx context.Context, userInfo models.User) context.Context {
	return context.WithValue(ctx, userInfoKey, userInfo)
}

func GetUserInfo(ctx context.Context) (models.User, bool) {
	user, ok := ctx.Value(userInfoKey).(models.User)
	return user, ok
}
