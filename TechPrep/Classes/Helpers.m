//
//  Helpers.m
//  TechPrep
//
//  Created by Shayne Czyzewski on 6/6/11.
//  Copyright 2011 University of Texas at Austin. All rights reserved.
//

#import "Helpers.h"
#import <CommonCrypto/CommonDigest.h>


@implementation Helpers

+ (NSString*)getExtraParams {
	NSString* salt = @"234j5gakli2l3k4j5apiosdfj098yasdf!"; // some random string
	NSString* product = @"java"; // pass in URL
	int epochInt = (int)[[NSDate date] timeIntervalSince1970];
	NSString* epochString = [NSString stringWithFormat:@"%d", epochInt]; // pass in URL
	NSString* encryptMe = [NSString stringWithFormat:@"%@%@%@", epochString, salt, product];
	NSString* encryptedString = [Helpers md5HexDigest:encryptMe]; // pass in URL
	return [NSString stringWithFormat:@"encr=%@&timestamp=%@&product=%@", encryptedString, epochString, product];
}

+ (NSString*)md5HexDigest:(NSString*)input {
    const char* str = [input UTF8String];
    unsigned char result[CC_MD5_DIGEST_LENGTH];
    CC_MD5(str, strlen(str), result);
	
    NSMutableString *ret = [NSMutableString stringWithCapacity:CC_MD5_DIGEST_LENGTH*2];
    for(int i = 0; i<CC_MD5_DIGEST_LENGTH; i++) {
        [ret appendFormat:@"%02x",result[i]];
    }
    return ret;
}

@end
